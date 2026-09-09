#!/usr/bin/env python3
import os
import sys
import json
import signal
import subprocess

CONFIG_FILE = os.path.join(os.path.dirname(__file__), 'restream_config.json')

def get_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r') as f:
            try:
                return json.load(f)
            except:
                pass
    return {"youtube_enabled": False, "youtube_key": ""}

def main():
    mtx_path = os.environ.get("MTX_PATH", "live_visual")
    
    config = get_config()
    youtube_enabled = config.get("youtube_enabled", False)
    youtube_key = config.get("youtube_key", "")

    # Base FFmpeg command: Input from MediaMTX (the vMix stream)
    cmd = [
        "ffmpeg",
        "-hide_banner",
        "-loglevel", "error",
        "-i", f"rtmp://localhost:1935/{mtx_path}",
        
        # Output 1: WebRTC Compatible Stream
        # Browsers require Opus audio for WebRTC. AAC will cause silent video.
        # We copy the video (0% CPU) and transcode audio to Opus.
        "-c:v", "copy",
        "-c:a", "libopus",
        "-b:a", "64k",
        "-f", "rtsp",
        f"rtsp://localhost:8554/{mtx_path}_webrtc"
    ]

    # Output 2: YouTube Direct Restream
    # Direct copy for both video and audio. No transcoding needed for YouTube.
    if youtube_enabled and youtube_key:
        cmd.extend([
            "-c:v", "copy",
            "-c:a", "copy",
            "-f", "flv",
            f"rtmp://a.rtmp.youtube.com/live2/{youtube_key}"
        ])

    print("Starting visual engine with command:", " ".join(cmd), flush=True)
    
    process = subprocess.Popen(cmd)

    def signal_handler(sig, frame):
        print("Received signal, terminating engine...", flush=True)
        process.terminate()
        process.wait()
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    process.wait()

if __name__ == "__main__":
    main()
