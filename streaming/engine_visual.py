#!/usr/bin/env python3
"""Copy the original H.264; only convert AAC to Opus for WebRTC."""
import os
import signal
import subprocess
import sys
import time


def build_command(path):
    target = 'gaulfm_webrtc' if path in ('gaulfm', 'live_visual', 'gaulfm_in') else f'{path}_webrtc'
    return [
        'ffmpeg', '-nostdin', '-hide_banner', '-loglevel', 'warning',
        '-fflags', '+genpts+discardcorrupt', '-rw_timeout', '10000000',
        # Read the original RTMP timestamps instead of converting through RTP/RTCP.
        '-i', f'rtmp://localhost:1935/{path}',
        '-map', '0:v:0', '-map', '0:a:0?', '-c:v', 'copy',
        '-af', 'aresample=async=1000:min_hard_comp=0.100000:first_pts=0',
        '-c:a', 'libopus', '-b:a', '128k', '-ar', '48000', '-ac', '2',
        '-vbr', 'on', '-application', 'audio', '-frame_duration', '20',
        '-cutoff', '20000', '-avoid_negative_ts', 'make_zero',
        # Zero means UNBOUNDED interleave wait in FFmpeg, not zero latency.
        '-max_interleave_delta', '100000', '-flush_packets', '1',
        '-rtsp_transport', 'tcp', '-f', 'rtsp', f'rtsp://localhost:8554/{target}',
    ]


def main():
    process = None
    stopped_at = None

    def stop(_sig, _frame):
        nonlocal stopped_at
        if stopped_at is None:
            stopped_at = time.monotonic()
        # Never wait() in a signal handler: it can interrupt Popen.wait while
        # its non-reentrant waitpid lock is held, deadlocking the hook forever.
        if process is not None and process.poll() is None:
            process.terminate()


    signal.signal(signal.SIGINT, stop)
    signal.signal(signal.SIGTERM, stop)
    command = build_command(os.environ.get('MTX_PATH', 'gaulfm'))
    if stopped_at is not None:
        return 0
    process = subprocess.Popen(command)
    if stopped_at is not None:
        stop(None, None)
    while True:
        try:
            code = process.wait(timeout=0.5)
            return 0 if stopped_at is not None else code
        except subprocess.TimeoutExpired:
            if stopped_at is not None and time.monotonic() - stopped_at > 3:
                process.kill()


if __name__ == '__main__':
    sys.exit(main())
