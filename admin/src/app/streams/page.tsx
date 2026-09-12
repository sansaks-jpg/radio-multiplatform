"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, Radio, Save, Tv, Video, Cast, Check, Volume2, VolumeX, ExternalLink, Play, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";

type TabType = "visual" | "audio" | "youtube";

export default function StreamsPage() {
  const toast = useToast();
  
  // Tab State
  const [activeTab, setActiveTab] = useState<TabType>("visual");

  // YouTube Restream States
  const [ytEnabled, setYtEnabled] = useState(false);
  const [ytKey, setYtKey] = useState("");
  const [vmixOnline, setVmixOnline] = useState<boolean | null>(null);
  const [youtubeStreaming, setYoutubeStreaming] = useState<boolean | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Monitor State
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(false);

  // Helper sync state
  const applyStreamData = useCallback((data: {
    youtube_enabled?: boolean;
    youtube_key?: string;
    vmix_online?: boolean;
    youtube_streaming?: boolean;
    last_error?: string | null;
  }) => {
    if (data.youtube_enabled !== undefined) {
      setYtEnabled(Boolean(data.youtube_enabled));
      setYtKey(data.youtube_key || "");
    }
    setVmixOnline(data.vmix_online ?? false);
    setYoutubeStreaming(data.youtube_streaming ?? false);
    setLastError(data.last_error || null);
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshingStatus(true);
    try {
      const res = await fetch("/api/stream/sync");
      if (!res.ok) throw new Error("Status API error");
      const data = await res.json();
      applyStreamData(data);
      toast.push("Status stream berhasil diperbarui");
    } catch {
      toast.push("Gagal memuat status cloud engine", "error");
    } finally {
      setIsRefreshingStatus(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const poll = async () => {
      try {
        const res = await fetch("/api/stream/sync");
        if (!res.ok || !isMounted) return;
        const data = await res.json();
        if (isMounted) {
          applyStreamData(data);
        }
      } catch {
        // Abaikan error pada polling otomatis di background
      }
    };

    void poll();
    const timer = setInterval(poll, 10000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [applyStreamData]);

  const copyText = async (text: string, id: string, label: string) => {
    let success = false;

    // 1. Coba Clipboard API modern jika di secure context
    if (typeof window !== "undefined" && navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        success = true;
      } catch {
        success = false;
      }
    }

    // 2. Fallback klasik untuk protokol HTTP non-secure (alamat IP publik)
    if (!success && typeof document !== "undefined") {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "-9999px";
        textArea.setAttribute("readonly", "");
        document.body.appendChild(textArea);
        textArea.select();
        textArea.setSelectionRange(0, 99999);
        success = document.execCommand("copy");
        document.body.removeChild(textArea);
      } catch {
        success = false;
      }
    }

    if (success) {
      setCopiedId(id);
      toast.push(`${label} berhasil disalin!`);
      setTimeout(() => setCopiedId(null), 2000);
    } else {
      window.prompt("Salin manual dengan Ctrl+C:", text);
    }
  };

  const handleSyncYoutube = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/stream/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          youtube_enabled: ytEnabled,
          youtube_key: ytKey,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setVmixOnline(data.vmix_online ?? false);
        setYoutubeStreaming(data.youtube_streaming ?? false);
        setLastError(data.last_error || null);
        toast.push(ytEnabled ? "Restream YouTube berhasil disimpan & diaktifkan!" : "Restream YouTube dinonaktifkan");
      } else {
        toast.push("Gagal menyimpan ke server", "error");
      }
    } catch {
      toast.push("Terjadi gangguan jaringan", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleAudio = () => {
    if (audioRef.current) {
      if (isAudioPlaying) {
        audioRef.current.pause();
        setIsAudioPlaying(false);
      } else {
        audioRef.current.src = `http://40.81.231.250:8000/live?t=${Date.now()}`;
        audioRef.current.play()
          .then(() => setIsAudioPlaying(true))
          .catch(() => toast.push("Stream RadioBOSS belum online", "error"));
      }
    }
  };

  const testVisualStream = () => {
    if (videoRef.current) {
      setIsVideoLoading(true);
      const hlsUrl = "http://40.81.231.250:8888/gaulfm_webrtc/index.m3u8";
      
      if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
        videoRef.current.src = hlsUrl;
        videoRef.current.play()
          .then(() => { setIsVideoPlaying(true); setIsVideoLoading(false); })
          .catch(() => { setIsVideoLoading(false); toast.push("Sinyal vMix belum tersambung", "error"); });
      } else {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/hls.js@1.5.7/dist/hls.min.js";
        script.onload = () => {
          // @ts-expect-error missing hls types
          if (window.Hls && window.Hls.isSupported()) {
            // @ts-expect-error missing hls types
            const hls = new window.Hls();
            hls.loadSource(hlsUrl);
            hls.attachMedia(videoRef.current);
            // @ts-expect-error missing hls types
            hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
              videoRef.current?.play()
                .then(() => { setIsVideoPlaying(true); setIsVideoLoading(false); })
                .catch(() => { setIsVideoLoading(false); });
            });
            // @ts-expect-error missing hls types
            hls.on(window.Hls.Events.ERROR, () => {
              setIsVideoLoading(false);
              toast.push("Sinyal visual studio belum online", "error");
            });
          }
        };
        document.body.appendChild(script);
      }
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* ── HEADER RINGKAS & RAMAH ── */}
      <PageHeader
        title="Studio Siaran Multiplatform"
        badge={<Badge tone="live" pulse>Server Aktif</Badge>}
        description="Pusat konfigurasi dan panduan integrasi audio/video software studio (vMix, RadioBOSS) serta YouTube Live."
        actions={
          <span className="text-xs text-muted-foreground font-mono bg-muted/60 px-2.5 py-1.5 rounded-md border border-border">
            Host: 40.81.231.250
          </span>
        }
      />

      {/* ── NAVIGASI TAB MENU BESAR & JELAS ── */}
      <div className="grid grid-cols-3 gap-2 bg-muted/40 p-1.5 rounded-xl border border-border/70">
        <button
          onClick={() => setActiveTab("visual")}
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold text-sm transition-all ${
            activeTab === "visual"
              ? "bg-card text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <Tv className={`h-4 w-4 ${activeTab === "visual" ? "text-accent" : ""}`} />
          <span>1. Visual (vMix / OBS)</span>
        </button>

        <button
          onClick={() => setActiveTab("audio")}
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold text-sm transition-all ${
            activeTab === "audio"
              ? "bg-card text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <Radio className={`h-4 w-4 ${activeTab === "audio" ? "text-brand" : ""}`} />
          <span>2. Audio (RadioBOSS)</span>
        </button>

        <button
          onClick={() => setActiveTab("youtube")}
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold text-sm transition-all ${
            activeTab === "youtube"
              ? "bg-card text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <Cast className={`h-4 w-4 ${activeTab === "youtube" ? "text-live" : ""}`} />
          <span>3. YouTube Live</span>
          {ytEnabled && <span className="h-2 w-2 rounded-full bg-live animate-pulse" />}
        </button>
      </div>

      {/* ── TAB 1: VISUAL RADIO (VMIX) ── */}
      {activeTab === "visual" && (
        <div className="grid lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
          
          {/* Kolom Kiri: Input Setup vMix */}
          <div className="lg:col-span-6 space-y-4">
            <Card className="border border-border">
              <CardHeader className="border-b border-border/60 pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Video className="h-5 w-5 text-accent" />
                  Pengaturan di Software vMix
                </CardTitle>
                <CardDescription>
                  Buka vMix $\to$ klik ikon gear pada menu <b>Stream</b> $\to$ pilih <b>Custom RTMP Server</b>, lalu isi data berikut:
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                
                {/* Parameter 1: URL */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    URL Server RTMP
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-muted/40 border border-border rounded-lg px-3.5 py-2.5 font-mono text-sm select-all">
                      rtmp://40.81.231.250:1935/
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => copyText("rtmp://40.81.231.250:1935/", "url_vmix", "URL RTMP")}
                      className="shrink-0 h-10 px-3.5"
                    >
                      {copiedId === "url_vmix" ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                      <span className="ml-1.5 text-xs">Salin</span>
                    </Button>
                  </div>
                </div>

                {/* Parameter 2: Stream Key */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Stream Name / Key
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-accent-soft border border-accent/40 text-accent font-bold rounded-lg px-3.5 py-2.5 font-mono text-sm select-all">
                      gaulfm
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => copyText("gaulfm", "key_vmix", "Stream Key")}
                      className="shrink-0 h-10 px-3.5"
                    >
                      {copiedId === "key_vmix" ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                      <span className="ml-1.5 text-xs">Salin</span>
                    </Button>
                  </div>
                </div>

                {/* Info Otomatis */}
                <div className="rounded-lg bg-muted/20 border border-border/80 p-3.5 text-xs text-muted-foreground leading-relaxed space-y-1">
                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                    💡 Cara Kerja Otomatis:
                  </p>
                  <p>
                    Server akan langsung menyalin video H.264 kamera Anda dan otomatis mengonversi audio studio ke WebRTC (Opus) agar bersuara jernih di HP pendengar tanpa jeda.
                  </p>
                </div>

              </CardContent>
            </Card>
          </div>

          {/* Kolom Kanan: Layar Monitor Studio */}
          <div className="lg:col-span-6 space-y-4">
            <Card className="border border-border shadow-sm overflow-hidden">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Monitor Siaran Langsung</CardTitle>
                  <CardDescription className="text-xs">
                    Tampilan langsung yang ditonton oleh pendengar di aplikasi HP.
                  </CardDescription>
                </div>
                {isVideoPlaying && <Badge tone="live" pulse>ON AIR</Badge>}
              </CardHeader>
              <div className="p-4 pt-0">
                <div className="aspect-video w-full rounded-xl bg-black overflow-hidden relative border border-border shadow-inner flex items-center justify-center">
                  <video ref={videoRef} className="w-full h-full object-contain" controls playsInline />
                  
                  {!isVideoPlaying && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-6 text-center">
                      <Tv className="h-10 w-10 text-muted-foreground/60 mb-3" />
                      <p className="text-sm font-medium text-white mb-1">Preview Studio</p>
                      <p className="text-xs text-muted-foreground max-w-xs mb-4">
                        Pastikan vMix sudah menekan tombol &quot;Stream&quot; sebelum memuat preview ini.
                      </p>
                      <Button
                        variant="primary"
                        onClick={testVisualStream}
                        disabled={isVideoLoading}
                        className="shadow-md"
                      >
                        {isVideoLoading ? (
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="mr-2 h-4 w-4 fill-current" />
                        )}
                        {isVideoLoading ? "Menghubungkan..." : "Cek Tampilan Siaran"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

        </div>
      )}

      {/* ── TAB 2: AUDIO RADIO (RADIOBOSS) ── */}
      {activeTab === "audio" && (
        <div className="max-w-2xl mx-auto space-y-4 animate-in fade-in duration-200">
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Radio className="h-5 w-5 text-brand" />
                  Pengaturan di Software RadioBOSS / SAM
                </CardTitle>
                {isAudioPlaying && <Badge tone="live" pulse>SUARA AKTIF</Badge>}
              </div>
              <CardDescription>
                Masukkan data server Icecast ini ke pengaturan <b>Broadcasting</b> di RadioBOSS agar judul lagu dan audio mengalir ke aplikasi.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              
              <SimpleCopyRow
                label="Server / Host"
                value="40.81.231.250"
                id="rb_ip"
                copiedId={copiedId}
                onCopy={copyText}
              />

              <SimpleCopyRow
                label="Port"
                value="8000"
                id="rb_port"
                copiedId={copiedId}
                onCopy={copyText}
              />

              <SimpleCopyRow
                label="Mount Point"
                value="/live"
                id="rb_mount"
                copiedId={copiedId}
                onCopy={copyText}
                highlight
              />

              <SimpleCopyRow
                label="Password Source"
                value="sourcepass123"
                id="rb_pass"
                copiedId={copiedId}
                onCopy={copyText}
              />

              {/* Player Audio Test */}
              <div className="pt-4 border-t border-border mt-4">
                <Button
                  variant={isAudioPlaying ? "outline" : "primary"}
                  className="w-full h-11"
                  onClick={toggleAudio}
                >
                  {isAudioPlaying ? (
                    <>
                      <VolumeX className="mr-2 h-4 w-4" />
                      Hentikan Suara Radio
                    </>
                  ) : (
                    <>
                      <Volume2 className="mr-2 h-4 w-4" />
                      Dengarkan Siaran Audio Radio
                    </>
                  )}
                </Button>
                <audio ref={audioRef} className="hidden" />
              </div>

            </CardContent>
          </Card>
        </div>
      )}

      {/* ── TAB 3: YOUTUBE LIVE RESTREAM ── */}
      {activeTab === "youtube" && (
        <div className="max-w-2xl mx-auto space-y-4 animate-in fade-in duration-200">
          <Card className="border border-border">
            <CardHeader className="border-b border-border/60 pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Cast className="h-5 w-5 text-live" />
                Siaran Ulang Otomatis ke YouTube Live
              </CardTitle>
              <CardDescription>
                Server cloud akan meneruskan siaran vMix studio Anda ke YouTube tanpa membebani laptop atau kuota internet studio Anda.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-4">
              
              {/* Panel Status Realtime Server & YouTube */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 rounded-xl bg-card border border-border/80 shadow-xs">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Sinyal Ingest vMix Studio:</span>
                    {vmixOnline === null ? (
                      <Badge variant="outline" className="text-[10px]">Memeriksa...</Badge>
                    ) : vmixOnline ? (
                      <Badge variant="success" className="text-[10px] gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Online (Mengudara)
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">
                        Offline (Siaga)
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {vmixOnline ? "Stream vMix studio terdeteksi aktif di server cloud." : "Kirim RTMP dari vMix laptop ke server untuk mengaktifkan."}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Restream YouTube Live:</span>
                    {youtubeStreaming ? (
                      <Badge variant="danger" className="text-[10px] gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                        Live Broadcast
                      </Badge>
                    ) : ytEnabled && !vmixOnline ? (
                      <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30">
                        Standby (Tunggu vMix)
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">
                        Nonaktif
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {youtubeStreaming ? "Server cloud sedang meneruskan siaran ke YouTube." : ytEnabled ? "Otomatis mengudara saat sinyal vMix studio online." : "Restream YouTube dimatikan."}
                  </p>
                </div>

                <div className="md:col-span-2 pt-2 border-t border-border/40 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    Auto-refresh status setiap 10 detik
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleManualRefresh}
                    disabled={isRefreshingStatus}
                    className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshingStatus ? "animate-spin" : ""}`} />
                    Perbarui Status
                  </Button>
                </div>
              </div>

              {lastError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-500">
                  <span className="font-semibold">Peringatan:</span> {lastError}
                </div>
              )}

              {/* Sakelar ON/OFF */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border">
                <div>
                  <p className="font-semibold text-sm text-foreground">Status Push YouTube</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {ytEnabled ? "Siaran vMix akan otomatis terkirim ke YouTube" : "Siaran hanya berjalan di Aplikasi Mobile"}
                  </p>
                </div>
                <Button
                  variant={ytEnabled ? "danger" : "secondary"}
                  size="sm"
                  onClick={() => setYtEnabled(!ytEnabled)}
                  className="font-bold text-xs px-4 h-9"
                >
                  {ytEnabled ? "Matikan" : "Aktifkan"}
                </Button>
              </div>

              {/* Input Key */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Stream Key YouTube Anda
                  </label>
                  <a
                    href="https://studio.youtube.com/channel/live"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-brand hover:underline inline-flex items-center gap-1"
                  >
                    Buka YouTube Studio <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <Input
                  type="password"
                  placeholder="Tempel Stream Key YouTube di sini (contoh: abcd-1234-efgh-5678)"
                  value={ytKey}
                  onChange={(e) => setYtKey(e.target.value)}
                  className="font-mono text-sm h-11"
                />
              </div>

              {/* Tombol Simpan */}
              <Button
                variant="primary"
                onClick={handleSyncYoutube}
                disabled={isSyncing}
                className="w-full h-11 text-sm font-semibold shadow-md"
              >
                <Save className="mr-2 h-4 w-4" />
                {isSyncing ? "Menyimpan ke Server..." : "Simpan & Terapkan Pengaturan"}
              </Button>

            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}

// Komponen baris salin yang rapi dan mudah
function SimpleCopyRow({
  label,
  value,
  id,
  copiedId,
  onCopy,
  highlight = false,
}: {
  label: string;
  value: string;
  id: string;
  copiedId: string | null;
  onCopy: (v: string, id: string, l: string) => void;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border hover:bg-muted/40 transition-colors">
      <div className="space-y-0.5">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className={`font-mono text-sm ${highlight ? "text-brand font-bold" : "text-foreground"}`}>
          {value}
        </p>
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onCopy(value, id, label)}
        className="h-8 px-3 text-xs"
      >
        {copiedId === id ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
        <span className="ml-1">{copiedId === id ? "Disalin" : "Salin"}</span>
      </Button>
    </div>
  );
}
