"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, RefreshCw } from "lucide-react";

function getHlsUrl(): string {
  if (process.env.NEXT_PUBLIC_VISUAL_HLS_URL) {
    return process.env.NEXT_PUBLIC_VISUAL_HLS_URL;
  }
  if (typeof window !== "undefined") {
    // Pada halaman HTTPS, selalu gunakan endpoint proxy relatif /hls/ agar tidak terjadi Mixed Content error
    if (window.location.protocol === "https:") {
      return "/hls/gaulfm/index.m3u8";
    }
  }
  return "http://40.81.231.250:8888/gaulfm/index.m3u8";
}

interface HlsInstance {
  loadSource(url: string): void;
  attachMedia(video: HTMLVideoElement): void;
  destroy(): void;
  stopLoad(): void;
  startLoad(): void;
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
  const hlsRef = useRef<HlsInstance | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!attempt || !videoRef.current) return;
    const video = videoRef.current;
    let cancelled = false;
    let failed = false;

    const fail = (errMsg: string) => {
      if (cancelled || failed) return;
      failed = true;
      setState("error");
      setMessage(errMsg);
      if (hlsRef.current) {
        hlsRef.current.stopLoad();
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      video.pause();
      video.removeAttribute("src");
      video.load();
    };

    const play = () => video.play().then(() => {
      if (!cancelled) setState("ready");
    }).catch(() => {
      if (!cancelled) setState("ready");
    });

    // Otomatis matikan download paket jaringan saat user klik pause di player native
    const onPause = () => {
      if (hlsRef.current) {
        hlsRef.current.stopLoad();
      }
    };

    // Otomatis lanjutkan download segmen saat user klik play di player native
    const onPlay = () => {
      if (hlsRef.current) {
        hlsRef.current.startLoad();
      }
    };

    const onError = () => fail("Video belum online. Pastikan vMix sedang streaming ke server lalu coba lagi.");

    video.addEventListener("pause", onPause);
    video.addEventListener("play", onPlay);
    video.addEventListener("error", onError);

    void (async () => {
      try {
        const hlsSource = getHlsUrl();
        const nativeHls = Boolean(video.canPlayType("application/vnd.apple.mpegurl"));
        if (!("MediaSource" in window) && nativeHls) {
          video.src = hlsSource;
          await play();
          return;
        }

        const Hls = await loadHls();
        if (cancelled) return;
        if (!Hls.isSupported()) {
          if (nativeHls) {
            video.src = hlsSource;
            await play();
            return;
          }
          throw new Error("Browser tidak mendukung video HLS.");
        }

        const hls = new Hls({
          lowLatencyMode: true,
          enableWorker: true,
          backBufferLength: 5,
          maxBufferLength: 5,
          maxMaxBufferLength: 10,
          liveSyncDurationCount: 2,
          liveMaxLatencyDurationCount: 5,
          maxLiveSyncPlaybackRate: 1.1,
        });

        hlsRef.current = hls;

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (!cancelled) void play();
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) onError();
        });

        hls.loadSource(hlsSource);
        hls.attachMedia(video);
      } catch (error) {
        fail(error instanceof Error ? error.message : "Video gagal dimuat.");
      }
    })();

    return () => {
      cancelled = true;
      video.removeEventListener("pause", onPause);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("error", onError);
      if (hlsRef.current) {
        hlsRef.current.stopLoad();
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [attempt]);

  return (
    <div className="aspect-video w-full rounded-xl bg-black overflow-hidden relative border border-border">
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        controls
        playsInline
      />

      {state === "idle" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 p-6 text-center">
          <p className="text-sm text-zinc-300">Preview Feed Studio</p>
          <Button
            size="sm"
            onClick={() => {
              setState("loading");
              setAttempt(prev => prev + 1);
            }}
          >
            <Play className="h-3.5 w-3.5 mr-1.5" />
            Cek Tampilan Siaran
          </Button>
        </div>
      )}

      {state === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <RefreshCw className="h-6 w-6 text-accent animate-spin" />
        </div>
      )}

      {state === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85 p-6 text-center">
          <p className="text-xs text-red-300 max-w-xs">{message}</p>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setState("loading");
              setAttempt(prev => prev + 1);
            }}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Coba Lagi
          </Button>
        </div>
      )}
    </div>
  );
}
