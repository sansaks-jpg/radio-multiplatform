#!/usr/bin/env python3
"""
Gaul FM Cloud Streaming Orchestrator & YouTube Restream Manager
Mengelola konfigurasi restreaming dan background process FFmpeg ke YouTube Live secara independen.
"""

from flask import Flask, request, jsonify
import json
import os
import sys
import time
import signal
import threading
import subprocess
import urllib.request

app = Flask(__name__)
CONFIG_FILE = os.path.join(os.path.dirname(__file__), 'restream_config.json')

def get_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r') as f:
                return json.load(f)
        except Exception:
            pass
    return {"youtube_enabled": False, "youtube_key": ""}

def save_config(cfg):
    try:
        with open(CONFIG_FILE, 'w') as f:
            json.dump(cfg, f, indent=2)
    except Exception as e:
        print(f"[Config] Error saving config: {e}", flush=True)

def check_vmix_ready():
    """Mengecek apakah sinyal video vMix sedang aktif di MediaMTX"""
    try:
        req = urllib.request.Request("http://127.0.0.1:9997/v3/paths/list")
        with urllib.request.urlopen(req, timeout=2) as response:
            data = json.loads(response.read().decode())
            for item in data.get("items", []):
                if item.get("name") in ["gaulfm", "live_visual"] and item.get("ready"):
                    return item.get("name")
    except Exception:
        pass
    return None

class YouTubeRestreamManager:
    def __init__(self):
        self.lock = threading.Lock()
        self.process = None
        self.active_path = None
        self.last_error = None
        self.running = True
        self.worker_thread = threading.Thread(target=self._loop, daemon=True)
        self.worker_thread.start()

    def sync(self):
        """Evaluasi kondisi dan start/stop restreaming ke YouTube"""
        with self.lock:
            config = get_config()
            yt_enabled = bool(config.get("youtube_enabled", False))
            yt_key = str(config.get("youtube_key", "")).strip()

            active_path = check_vmix_ready()
            should_stream = yt_enabled and bool(yt_key) and bool(active_path)

            if should_stream:
                is_alive = self.process is not None and self.process.poll() is None
                if not is_alive or self.active_path != active_path:
                    self._stop_process()
                    self._start_process(active_path, yt_key)
            else:
                self._stop_process()

    def _start_process(self, path_name, yt_key):
        # Format RTMP YouTube: Video copy, Audio AAC 160k 44.1kHz (Standar FLV YouTube)
        cmd = [
            "ffmpeg",
            "-hide_banner",
            "-loglevel", "warning",
            "-rtsp_transport", "tcp",
            "-i", f"rtsp://localhost:8554/{path_name}",
            "-c:v", "copy",
            "-c:a", "aac",
            "-b:a", "160k",
            "-ar", "44100",
            "-f", "flv",
            f"rtmp://a.rtmp.youtube.com/live2/{yt_key}"
        ]
        try:
            self.process = subprocess.Popen(cmd)
            self.active_path = path_name
            self.last_error = None
            print(f"[YouTubeManager] Restream YouTube DIMULAI dari path '{path_name}'", flush=True)
        except Exception as e:
            self.last_error = str(e)
            print(f"[YouTubeManager] Gagal memulai FFmpeg YouTube: {e}", flush=True)

    def _stop_process(self):
        if self.process is not None:
            if self.process.poll() is None:
                print("[YouTubeManager] Menghentikan restream YouTube...", flush=True)
                try:
                    self.process.terminate()
                    self.process.wait(timeout=3)
                except Exception:
                    self.process.kill()
            self.process = None
            self.active_path = None

    def _loop(self):
        while self.running:
            try:
                self.sync()
            except Exception as e:
                print(f"[YouTubeManager] Error pada background loop: {e}", flush=True)
            time.sleep(3)

    def get_status(self):
        with self.lock:
            active_path = check_vmix_ready()
            is_streaming = self.process is not None and self.process.poll() is None
            return {
                "vmix_online": bool(active_path),
                "vmix_path": active_path,
                "youtube_streaming": is_streaming,
                "last_error": self.last_error
            }

    def shutdown(self):
        self.running = False
        self._stop_process()

manager = YouTubeRestreamManager()

@app.route('/config', methods=['GET'])
def read_config():
    cfg = get_config()
    status = manager.get_status()
    response_data = {
        "youtube_enabled": cfg.get("youtube_enabled", False),
        "youtube_key": cfg.get("youtube_key", ""),
        "vmix_online": status["vmix_online"],
        "vmix_path": status["vmix_path"],
        "youtube_streaming": status["youtube_streaming"],
        "last_error": status["last_error"]
    }
    return jsonify(response_data)

@app.route('/config', methods=['POST'])
def update_config():
    data = request.get_json(silent=True) or {}
    config = get_config()

    if "youtube_enabled" in data:
        config["youtube_enabled"] = bool(data["youtube_enabled"])
    if "youtube_key" in data:
        config["youtube_key"] = str(data["youtube_key"]).strip()

    save_config(config)

    # Segera sinkronkan restreaming tanpa menunggu timer 3 detik
    threading.Thread(target=manager.sync, daemon=True).start()

    status = manager.get_status()
    return jsonify({
        "status": "success",
        "youtube_enabled": config.get("youtube_enabled", False),
        "youtube_key": config.get("youtube_key", ""),
        "vmix_online": status["vmix_online"],
        "vmix_path": status["vmix_path"],
        "youtube_streaming": status["youtube_streaming"],
        "last_error": status["last_error"]
    })

def cleanup(sig, frame):
    print("[YouTubeManager] Menerima sinyal terminasi...", flush=True)
    manager.shutdown()
    sys.exit(0)

signal.signal(signal.SIGINT, cleanup)
signal.signal(signal.SIGTERM, cleanup)

if __name__ == '__main__':
    # Listen on all interfaces (internal 127.0.0.1 accessible by Next.js)
    app.run(host='0.0.0.0', port=8092)
