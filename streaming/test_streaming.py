import io
import json
import os
import sys
import tempfile
import subprocess
import signal
import unittest
from unittest.mock import Mock, patch

sys.path.insert(0, os.path.dirname(__file__))
import api_server as api
import engine_visual


class StreamingTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.config_patch = patch.object(api, 'CONFIG_FILE', os.path.join(self.temp.name, 'config.json'))
        self.config_patch.start()
        self.manager = api.YouTubeRestreamManager()
        self.manager_patch = patch.object(api, 'manager', self.manager)
        self.manager_patch.start()
        self.client = api.app.test_client()

    def tearDown(self):
        self.manager_patch.stop()
        self.config_patch.stop()
        self.temp.cleanup()

    def config(self, enabled=True, key='test-key'):
        api.save_config({'youtube_enabled': enabled, 'youtube_key': key})

    def active(self):
        process = Mock()
        process.poll.return_value = None
        self.manager.process = process
        self.manager.active_key = 'test-key'
        self.manager.active_path = 'gaulfm'
        self.manager.started_at = api.time.monotonic()
        return process

    def test_key_rotation_restarts_active_publisher(self):
        self.config(key='replacement-key')
        process = self.active()
        with patch.object(api, 'check_vmix_ready', return_value='gaulfm'), patch.object(self.manager, '_start_process') as start:
            self.manager.sync()
        process.terminate.assert_called_once()
        start.assert_called_once_with('gaulfm', 'replacement-key')

    def test_transient_status_failure_does_not_kill_stream(self):
        self.config()
        process = self.active()
        with patch.object(api, 'check_vmix_ready', side_effect=TimeoutError):
            self.manager.sync()
        process.terminate.assert_not_called()
        self.assertIsNone(self.manager.get_status()['vmix_online'])

    def test_dead_process_records_error_and_backs_off(self):
        self.config()
        process = self.active()
        process.poll.return_value = 1
        with patch.object(api, 'check_vmix_ready', return_value='gaulfm'), patch.object(self.manager, '_start_process') as start:
            self.manager.sync()
            self.manager.sync()
        self.assertIn('exit 1', self.manager.last_error)
        start.assert_not_called()

    def test_stalled_process_is_reaped(self):
        self.config()
        process = self.active()
        self.manager.started_at -= 40
        with patch.object(api, 'check_vmix_ready', return_value='gaulfm'):
            self.manager.sync()
        process.terminate.assert_called_once()
        process.wait.assert_called()
        self.assertIsNone(self.manager.process)

    def test_spawn_does_not_mean_youtube_is_receiving(self):
        self.active()
        status = self.manager.get_status()
        self.assertFalse(status['youtube_streaming'])
        self.assertTrue(status['youtube_connecting'])

    def test_progress_drives_sending_status(self):
        process = self.active()
        process.stdout = io.StringIO('out_time_us=N/A\nout_time_us=500000\n')
        self.manager._read_progress(process)
        self.assertTrue(self.manager.get_status()['youtube_streaming'])

    def test_secret_redacted_from_ffmpeg_errors(self):
        process = self.active()
        process.stderr = io.StringIO('Failed rtmps://a.rtmps.youtube.com/live2/test-key test-key\n')
        self.manager._read_errors(process, 'test-key')
        self.assertNotIn('test-key', ''.join(self.manager.errors))

    def test_public_config_never_exposes_key(self):
        self.config()
        result = self.client.get('/config')
        self.assertEqual(result.status_code, 200)
        self.assertNotIn('youtube_key', result.json)
        self.assertTrue(result.json['youtube_key_configured'])

    def test_toggle_preserves_existing_key(self):
        self.config()
        result = self.client.post('/config', json={'youtube_enabled': False})
        self.assertEqual(result.status_code, 200)
        self.assertEqual(api.get_config()['youtube_key'], 'test-key')

    def test_invalid_config_returns_400(self):
        for payload in [[], {}, {'youtube_enabled': 'false'}, {'youtube_key': ''}, {'youtube_key': '../bad?key'}, {'youtube_enabled': True}]:
            with self.subTest(payload=payload):
                self.assertEqual(self.client.post('/config', json=payload).status_code, 400)

    def test_failed_save_keeps_old_config_and_reports_failure(self):
        self.config()
        with patch.object(api.os, 'replace', side_effect=OSError('disk full')):
            result = self.client.post('/config', json={'youtube_enabled': False})
        self.assertEqual(result.status_code, 500)
        self.assertTrue(api.get_config()['youtube_enabled'])
        self.assertEqual(os.listdir(self.temp.name), ['config.json'])

    def test_corrupt_config_is_not_silently_overwritten(self):
        with open(api.CONFIG_FILE, 'w') as f:
            f.write('{broken')
        self.assertEqual(self.client.post('/config', json={'youtube_enabled': False}).status_code, 500)

    def test_disabled_youtube_stops_even_if_mtx_unreachable(self):
        self.config(enabled=False)
        process = self.active()
        with patch.object(api, 'check_vmix_ready', side_effect=TimeoutError):
            self.manager.sync()
        process.terminate.assert_called_once()

    @unittest.skipIf(os.name == 'nt', 'POSIX signal lifecycle on production Linux')
    def test_sigterm_during_child_wait_reaps_child_and_exits(self):
        code = """
import engine_visual, subprocess, sys
real_popen = subprocess.Popen
def child(_command):
    process = real_popen([sys.executable, '-c', 'import time; time.sleep(60)'])
    print(process.pid, flush=True)
    return process
engine_visual.subprocess.Popen = child
raise SystemExit(engine_visual.main())
"""
        wrapper = subprocess.Popen([sys.executable, '-u', '-c', code],
            cwd=os.path.dirname(__file__), stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        child_pid = int(wrapper.stdout.readline().strip())
        try:
            wrapper.terminate()
            self.assertEqual(wrapper.wait(timeout=5), 0)
            with self.assertRaises(ProcessLookupError):
                os.kill(child_pid, 0)
        finally:
            if wrapper.poll() is None:
                wrapper.kill()
                wrapper.wait(timeout=3)
            try: os.kill(child_pid, signal.SIGKILL)
            except ProcessLookupError: pass
            wrapper.stdout.close()
            wrapper.stderr.close()

    def test_visual_command_preserves_video_and_bounds_mux_wait(self):
        cmd = engine_visual.build_command('gaulfm')
        self.assertIn('rtmp://localhost:1935/gaulfm', cmd)
        self.assertEqual(cmd[cmd.index('-c:v') + 1], 'copy')
        self.assertEqual(cmd[cmd.index('-max_interleave_delta') + 1], '100000')
        self.assertIn('-nostdin', cmd)
        self.assertEqual(cmd[-1], 'rtsp://localhost:8554/gaulfm_webrtc')


if __name__ == '__main__':
    unittest.main(verbosity=2)
