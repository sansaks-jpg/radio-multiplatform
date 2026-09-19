"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Play, RefreshCw, AlertCircle } from "lucide-react";

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
  const [isActive, setIsActive] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "playing" | "paused" | "error" | "blocked">("idle");
  const [message, setMessage] = useState("");
  const [attempt, setAttempt] = useState(0);

  // Fungsi mematikan total preview untuk menghemat 100% kuota internet
  const stopPreview = () => {
    if (hlsRef.current) {
      hlsRef.current.stopLoad();
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }
    setIsActive(false);
    setState("idle");
    setMessage("");
  };

  const startPreview = () => {
    setIsActive(true);
    setState("loading");
    setMessage("Menghubungkan ke video studio...");
    setAttempt(prev => prev + 1);
  };

  useEffect(() => {
    if (!isActive || !attempt || !videoRef.current) return;
    const video = videoRef.current;
    let cancelled = false;
    let previousTime = 0;
    let lastProgress = Date.now();
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

    const play = () => video.play().catch(() => {
      if (!cancelled) {
        setState("blocked");
        setMessage("Klik tombol di bawah untuk mengaktifkan video.");
      }
    });

    const onProgress = () => {
      if (!failed && video.readyState >= 2 && video.currentTime !== previousTime) {
        previousTime = video.currentTime;
        lastProgress = Date.now();
        setState("playing");
      }
    };

    // ANTI-SEDOT KUOTA: Saat user pause video, langsung stop fetching jaringan Hls.js!
    const onPause = () => {
      if (cancelled || failed) return;
      setState("paused");
      if (hlsRef.current) {
        hlsRef.current.stopLoad(); // Menghentikan seluruh request download segmen TS dan playlist M3U8
      }
    };

    // Saat user memutar kembali (play), lanjutkan download segmen terbaru
    const onPlay = () => {
      if (cancelled || failed) return;
      if (hlsRef.current) {
        hlsRef.current.startLoad();
      }
      setState("playing");
    };

    const onError = () => fail("Video belum online. Pastikan vMix sedang streaming ke server lalu coba lagi.");

    video.addEventListener("timeupdate", onProgress);
    video.addEventListener("pause", onPause);
    video.addEventListener("play", onPlay);
    video.addEventListener("error", onError);

    const watchdog = setInterval(() => {
      // Jika paused, jangan anggap timeout
      if (video.paused) {
        lastProgress = Date.now();
        return;
      }
      if (Date.now() - lastProgress > 20000) {
        fail("Tidak menerima video. Periksa sinyal vMix lalu coba lagi.");
      }
    }, 3000);

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
          throw new Error("Browser tidak mendukung pemutar video HLS.");
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
      clearInterval(watchdog);
      video.removeEventListener("timeupdate", onProgress);
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
  }, [attempt, isActive]);

  return (
    <div className="space-y-2">
      <div className="aspect-video w-full rounded-xl bg-black overflow-hidden relative border border-border shadow-xs">
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          controls
          playsInline
        />

        {/* Overlay saat tidak sedang aktif atau ada pesan / error */}
        {(!isActive || state !== "playing") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85 p-6 text-center z-10">
            {state === "idle" && (
              <>
                <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center text-accent">
                  <Eye className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Monitor Video vMix Studio</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Hanya aktif saat diperiksa agar hemat kuota internet.
                  </p>
                </div>
                <Button variant="primary" size="sm" onClick={startPreview}>
                  <Play className="h-3.5 w-3.5 mr-1.5" />
                  Cek Tampilan Siaran
                </Button>
              </>
            )}

            {state === "loading" && (
              <>
                <RefreshCw className="h-6 w-6 text-accent animate-spin" />
                <p className="text-xs text-zinc-300 font-medium">{message || "Menghubungkan..."}</p>
              </>
            )}

            {state === "paused" && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-warning">
                  ⏸️ Video Dijeda (Download Kuota Dihentikan)
                </p>
                <div className="flex gap-2 justify-center">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => void videoRef.current?.play()}
                  >
                    <Play className="h-3.5 w-3.5 mr-1" />
                    Lanjutkan Nonton
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={stopPreview}
                  >
                    <EyeOff className="h-3.5 w-3.5 mr-1" />
                    Tutup Preview
                  </Button>
                </div>
              </div>
            )}

            {state === "blocked" && (
              <>
                <p className="text-xs text-zinc-300">{message}</p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    void videoRef.current?.play()
                      .then(() => setState("playing"))
                      .catch(() => setMessage("Browser menolak pemutaran video otomatis."));
                  }}
                >
                  <Play className="h-3.5 w-3.5 mr-1" />
                  Putar Video
                </Button>
              </>
            )}

            {state === "error" && (
              <>
                <div className="h-9 w-9 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <p className="text-xs text-red-300 max-w-xs">{message}</p>
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" onClick={startPreview}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1" />
                    Coba Lagi
                  </Button>
                  <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white" onClick={stopPreview}>
                    Tutup
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Tombol Stop Cepat di Sudut Kanan Atas saat Video Sedang Diputar */}
        {isActive && state === "playing" && (
          <button
            onClick={stopPreview}
            title="Matikan Preview & Hemat Kuota"
            className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5 px-2.5 py-1 bg-black/70 hover:bg-black text-white text-[11px] font-medium rounded-md border border-white/20 backdrop-blur-xs transition-colors shadow-sm"
          >
            <EyeOff className="h-3 w-3 text-red-400" />
            <span>Matikan Preview (Hemat Kuota)</span>
          </button>
        )}
      </div>

      {isActive && (
        <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
          <span>💡 Kuota hanya terpakai saat preview aktif.</span>
          <button
            onClick={stopPreview}
            className="text-brand hover:underline font-medium"
          >
            Matikan Preview
          </button>
        </div>
      )}
    </div>
  );
}
