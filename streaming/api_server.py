#!/usr/bin/env python3
"""Loopback-only streaming control; credentials never leave this service."""
import json
import os
import re
import signal
import subprocess
import tempfile
import threading
import time
import urllib.request
from collections import deque
from flask import Flask, jsonify, request

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 4096
CONFIG_FILE = os.path.join(os.path.dirname(__file__), 'restream_config.json')
CONFIG_LOCK = threading.RLock()
INGEST_PATHS = ('gaulfm', 'live_visual', 'gaulfm_in')


def get_config():
    with CONFIG_LOCK:
        try:
            with open(CONFIG_FILE, encoding='utf-8') as f:
                data = json.load(f)
            if not isinstance(data, dict):
                raise ValueError('Invalid configuration')
            return data
        except FileNotFoundError:
            return {'youtube_enabled': False, 'youtube_key': ''}


def save_config(cfg):
    with CONFIG_LOCK:
        fd, temporary = tempfile.mkstemp(dir=os.path.dirname(CONFIG_FILE), prefix='.restream-')
        try:
            with os.fdopen(fd, 'w', encoding='utf-8') as f:
                json.dump(cfg, f, indent=2)
                f.flush()
                os.fsync(f.fileno())
            os.replace(temporary, CONFIG_FILE)
        finally:
            if os.path.exists(temporary):
                os.unlink(temporary)


def check_vmix_ready():
    # Failure means unknown, not offline: don't kill a healthy stream on an API timeout.
    with urllib.request.urlopen('http://127.0.0.1:9997/v3/paths/list?itemsPerPage=100', timeout=2) as response:
        items = json.load(response).get('items', [])
    return next((name for name in INGEST_PATHS if any(
        item.get('name') == name and item.get('ready') for item in items)), None)


def youtube_command(path, key):
    return ['ffmpeg', '-nostdin', '-hide_banner', '-loglevel', 'warning',
            '-progress', 'pipe:1', '-stats_period', '1',
            '-rw_timeout', '10000000',
            '-fflags', '+genpts+discardcorrupt', '-i', f'rtmp://localhost:1935/{path}',
            '-map', '0:v:0', '-map', '0:a:0?', '-c:v', 'copy',
            # vMix RTMP already carries AAC, which YouTube accepts unchanged.
            '-c:a', 'copy', '-max_interleave_delta', '100000', '-flush_packets', '1',
            '-avoid_negative_ts', 'make_zero', '-rw_timeout', '10000000',
            '-f', 'flv', f'rtmps://a.rtmps.youtube.com:443/live2/{key}']


class YouTubeRestreamManager:
    def __init__(self):
        self.lock = threading.RLock()
        self.wake = threading.Event()
        self.running = False
        self.worker_thread = None
        self.process = None
        self.active_path = self.active_key = self.vmix_path = None
        self.vmix_online = None
        self.last_error = None
        self.errors = deque(maxlen=3)
        self.started_at = self.last_progress = self.progress_value = self.retry_at = 0
        self.failures = 0

    def start(self):
        if not self.running:
            self.running = True
            self.worker_thread = threading.Thread(target=self._loop, daemon=True)
            self.worker_thread.start()

    def sync(self):
        with self.lock:
            cfg = get_config()
            enabled = cfg.get('youtube_enabled') is True
            key = str(cfg.get('youtube_key', '')).strip()
            try:
                path = check_vmix_ready()
                self.vmix_path, self.vmix_online = path, bool(path)
            except Exception:
                self.vmix_online = None
                path = self.active_path
                self.last_error = 'Status MediaMTX tidak dapat diperiksa.'
            if not enabled or not key or self.vmix_online is False:
                self._stop_process()
                self.failures = self.retry_at = 0
                return
            now = time.monotonic()
            if self.process is not None:
                changed = self.active_key != key or self.active_path != path
                exit_code = self.process.poll()
                stalled = now - (self.last_progress or self.started_at) > 30
                if changed:
                    self._stop_process()
                    self.retry_at = self.failures = 0
                elif exit_code is not None or stalled:
                    self.last_error = ('; '.join(self.errors) or
                        (f'Pengiriman YouTube berhenti (exit {exit_code}).' if exit_code is not None
                         else 'Pengiriman YouTube tidak bergerak selama 30 detik.'))
                    self._stop_process()
                    self.failures += 1
                    self.retry_at = now + min(60, 3 * 2 ** min(self.failures - 1, 5))
                elif self.last_progress:
                    self.failures = 0
            if self.process is None and path and self.vmix_online is True and now >= self.retry_at:
                self._start_process(path, key)

    def _start_process(self, path, key):
        try:
            process = subprocess.Popen(youtube_command(path, key), stdout=subprocess.PIPE,
                                       stderr=subprocess.PIPE, text=True, bufsize=1)
            self.process, self.active_path, self.active_key = process, path, key
            self.started_at = time.monotonic()
            self.last_progress = self.progress_value = 0
            self.errors.clear()
            threading.Thread(target=self._read_progress, args=(process,), daemon=True).start()
            threading.Thread(target=self._read_errors, args=(process, key), daemon=True).start()
        except OSError:
            self.last_error = 'FFmpeg tidak dapat dijalankan.'
            self.failures += 1
            self.retry_at = time.monotonic() + min(60, 3 * 2 ** min(self.failures - 1, 5))

    def _read_progress(self, process):
        try:
            for line in process.stdout:
                if self.process is not process:
                    break
                if line.startswith('out_time_us='):
                    try:
                        value = int(line.partition('=')[2])
                    except ValueError:
                        continue
                    if value > self.progress_value:
                        self.progress_value = value
                        self.last_progress = time.monotonic()
                        self.last_error = None
        finally:
            process.stdout.close()

    def _read_errors(self, process, key):
        try:
            for line in process.stderr:
                if self.process is not process:
                    break
                safe = re.sub(r'rtmps?://\S+', '[YouTube endpoint]', line.replace(key, '[redacted]'))
                if safe.strip():
                    self.errors.append(safe.strip()[:400])
        finally:
            process.stderr.close()

    def _stop_process(self):
        process = self.process
        self.process = None
        if process is not None:
            if process.poll() is None:
                process.terminate()
                try:
                    process.wait(timeout=3)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait(timeout=3)
            else:
                process.wait()
        self.active_path = self.active_key = None
        self.last_progress = 0

    def _loop(self):
        while self.running:
            try:
                self.sync()
            except Exception:
                self.last_error = 'Konfigurasi/layanan streaming tidak dapat diproses.'
            self.wake.wait(3)
            self.wake.clear()

    def get_status(self):
        with self.lock:
            alive = self.process is not None and self.process.poll() is None
            sending = bool(alive and self.last_progress and time.monotonic() - self.last_progress < 15)
            return {'vmix_online': self.vmix_online, 'vmix_path': self.vmix_path,
                    'youtube_streaming': sending, 'youtube_connecting': bool(alive and not sending),
                    'last_error': self.last_error}

    def shutdown(self):
        self.running = False
        self.wake.set()
        if self.worker_thread:
            self.worker_thread.join(timeout=6)
        with self.lock:
            self._stop_process()


manager = YouTubeRestreamManager()


def response_config(cfg):
    return {'youtube_enabled': cfg.get('youtube_enabled') is True,
            'youtube_key_configured': bool(cfg.get('youtube_key')), **manager.get_status()}


@app.after_request
def no_cache(response):
    response.headers['Cache-Control'] = 'no-store'
    return response


@app.route('/config', methods=['GET'])
def read_config():
    try:
        return jsonify(response_config(get_config()))
    except (ValueError, OSError):
        return jsonify(error='Konfigurasi tidak dapat dibaca.'), 500


@app.route('/config', methods=['POST'])
def update_config():
    data = request.get_json(silent=True)
    if not isinstance(data, dict) or not data or set(data) - {'youtube_enabled', 'youtube_key'}:
        return jsonify(error='Format konfigurasi tidak valid.'), 400
    if 'youtube_enabled' in data and type(data['youtube_enabled']) is not bool:
        return jsonify(error='youtube_enabled harus boolean.'), 400
    if 'youtube_key' in data and (not isinstance(data['youtube_key'], str) or
            not re.fullmatch(r'[A-Za-z0-9_-]{1,256}', data['youtube_key'].strip())):
        return jsonify(error='Stream key tidak valid.'), 400
    try:
        with CONFIG_LOCK:
            cfg = get_config()
            cfg.update(data)
            if 'youtube_key' in data:
                cfg['youtube_key'] = data['youtube_key'].strip()
            if cfg.get('youtube_enabled') and not cfg.get('youtube_key'):
                return jsonify(error='Masukkan stream key sebelum mengaktifkan YouTube.'), 400
            if data.get('youtube_enabled') is True:
                try:
                    path = check_vmix_ready()
                    if not path:
                        return jsonify(error='Sinyal video vMix belum masuk ke server. Nyalakan stream di vMix terlebih dahulu.'), 400
                except Exception:
                    pass
            save_config(cfg)
        manager.wake.set()
        return jsonify(status='success', **response_config(cfg))
    except (ValueError, OSError):
        return jsonify(error='Konfigurasi gagal disimpan; pengaturan sebelumnya dipertahankan.'), 500


if __name__ == '__main__':
    def cleanup(_sig, _frame):
        manager.shutdown()
        raise SystemExit(0)
    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)
    manager.start()
    app.run(host='127.0.0.1', port=8092, use_reloader=False)
