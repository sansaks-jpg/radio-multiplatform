"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

// HLS remains AAC: the Opus WebRTC path is not a portable Safari HLS source.
const HLS_URL = process.env.NEXT_PUBLIC_VISUAL_HLS_URL || "http://40.81.231.250:8888/gaulfm/index.m3u8";
interface HlsInstance {
  loadSource(url: string): void;
  attachMedia(video: HTMLVideoElement): void;
  destroy(): void;
  on(event: string, callback: (_event: unknown, data: { fatal?: boolean }) => void): void;
}
interface HlsConstructor {
  new(options: Record<string, unknown>): HlsInstance;
  isSupported(): boolean;
  Events: { MANIFEST_PARSED: string; ERROR: string };
}
let hlsLoader: Promise<HlsConstructor> | null = null;
function loadHls(): Promise<HlsConstructor> {
  if (!hlsLoader) hlsLoader = new Promise<HlsConstructor>((resolve, reject) => {
    const script = document.createElement("script");
    const timer = setTimeout(() => { script.remove(); reject(new Error("Pemutar video gagal dimuat.")); }, 12000);
    script.src = "https://cdn.jsdelivr.net/npm/hls.js@1.5.7/dist/hls.min.js";
    script.onload = () => {
      clearTimeout(timer);
      const constructor = (window as Window & { Hls?: HlsConstructor }).Hls;
      if (constructor) resolve(constructor); else reject(new Error("Pemutar video tidak tersedia."));
    };
    script.onerror = () => { clearTimeout(timer); script.remove(); reject(new Error("Pemutar video gagal dimuat.")); };
    document.head.appendChild(script);
  }).catch(error => { hlsLoader = null; throw error; });
  return hlsLoader;
}

export function StreamPreview() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState("idle");
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!attempt || !videoRef.current) return;
    const video = videoRef.current;
    let cancelled = false;
    let hls: HlsInstance | null = null;
    let lastProgress = Date.now();
    let previousTime = 0;
    let failed = false;
    const fail = (message: string) => {
      if (cancelled || failed) return;
      failed = true;
      setState("error"); setMessage(message);
      hls?.destroy(); hls = null;
      video.pause(); video.removeAttribute("src"); video.load();
    };
    const play = () => video.play().catch(() => {
      if (!cancelled) { setState("blocked"); setMessage("Tekan Putar untuk mengaktifkan video."); }
    });
    const onProgress = () => {
      if (!failed && video.readyState >= 2 && video.currentTime !== previousTime) {
        previousTime = video.currentTime; lastProgress = Date.now(); setState("playing");
      }
    };
    const onError = () => fail("Video belum tersedia atau koneksi terputus. Coba lagi.");
    video.addEventListener("timeupdate", onProgress);
    video.addEventListener("error", onError);
    const watchdog = setInterval(() => {
      if (video.paused && previousTime > 0) lastProgress = Date.now();
      if (Date.now() - lastProgress > 20000) fail("Tidak menerima video. Periksa sinyal vMix lalu coba lagi.");
    }, 3000);
    void (async () => {
      try {
        if (window.location.protocol === "https:" && HLS_URL.startsWith("http:")) {
          throw new Error("Alamat video harus HTTPS untuk panel HTTPS. Atur NEXT_PUBLIC_VISUAL_HLS_URL.");
        }
        const nativeHls = Boolean(video.canPlayType("application/vnd.apple.mpegurl"));
        if (!("MediaSource" in window) && nativeHls) {
          video.src = HLS_URL; await play(); return;
        }
        const Hls = await loadHls();
        if (cancelled) return;
        if (!Hls.isSupported()) {
          if (nativeHls) { video.src = HLS_URL; await play(); return; }
          throw new Error("Browser tidak mendukung video HLS.");
        }
        hls = new Hls({ lowLatencyMode: true, enableWorker: true, backBufferLength: 10,
          maxBufferLength: 10, maxMaxBufferLength: 20, liveSyncDurationCount: 2,
          liveMaxLatencyDurationCount: 5, maxLiveSyncPlaybackRate: 1.1 });
        hls.on(Hls.Events.MANIFEST_PARSED, () => { if (!cancelled) void play(); });
        hls.on(Hls.Events.ERROR, (_event, data) => { if (data.fatal) onError(); });
        hls.loadSource(HLS_URL); hls.attachMedia(video);
      } catch (error) { fail(error instanceof Error ? error.message : "Video gagal dimuat."); }
    })();
    return () => {
      cancelled = true; clearInterval(watchdog);
      video.removeEventListener("timeupdate", onProgress); video.removeEventListener("error", onError);
      hls?.destroy(); video.pause(); video.removeAttribute("src"); video.load();
    };
  }, [attempt]);
  return <div className="aspect-video w-full rounded-xl bg-black overflow-hidden relative border border-border">
    <video ref={videoRef} className="w-full h-full object-contain" controls playsInline />
    {state !== "playing" && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 p-6 text-center">
      <p className="text-sm text-white">{state === "idle" ? "Preview studio" : state === "loading" ? "Menghubungkan video..." : message}</p>
      <Button disabled={state === "loading"} onClick={() => {
        if (state === "blocked") {
          void videoRef.current?.play().then(() => setState("playing")).catch(() => setMessage("Browser menolak pemutaran video."));
        } else { setState("loading"); setAttempt(value => value + 1); }
      }}>{state === "blocked" ? "Putar" : state === "idle" ? "Cek Tampilan Siaran" : "Coba Lagi"}</Button>
    </div>}
  </div>;
}
