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
    mtx_path = os.environ.get("MTX_PATH", "gaulfm")
    
    config = get_config()
    youtube_enabled = config.get("youtube_enabled", False)
    youtube_key = config.get("youtube_key", "")

    target_webrtc_path = "gaulfm_webrtc" if mtx_path in ["gaulfm", "live_visual", "gaulfm_in"] else f"{mtx_path}_webrtc"

    # Base FFmpeg command: Input from MediaMTX via local RTSP with DTS/PTS normalization
    cmd = [
        "ffmpeg",
        "-hide_banner",
        "-loglevel", "warning",
        "-fflags", "+genpts+discardcorrupt",
        "-avoid_negative_ts", "make_zero",
        "-rtsp_transport", "tcp",
        "-i", f"rtsp://localhost:8554/{mtx_path}",
        
        # Video: Direct copy with normalized timestamps (0% CPU, ultra smooth)
        "-c:v", "copy",
        
        # Audio: Studio Broadcast Opus (Fullband 20kHz, smooth music profile like YouTube)
        "-c:a", "libopus",
        "-b:a", "128k",
        "-vbr", "on",
        "-application", "audio",
        "-cutoff", "20000",
        
        # Output RTSP via TCP without interleave latency
        "-max_interleave_delta", "0",
        "-rtsp_transport", "tcp",
        "-f", "rtsp",
        f"rtsp://localhost:8554/{target_webrtc_path}"
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
