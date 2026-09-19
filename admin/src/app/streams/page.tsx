"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Copy,
  Radio,
  Tv,
  Video,
  Cast,
  Check,
  Volume2,
  VolumeX,
  ExternalLink,
  RefreshCw,
  CircleStop,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";

import { StreamPreview } from "./StreamPreview";
import { YouTubeAccountManager } from "@/components/YouTubeAccountManager";

type TabType = "visual" | "audio" | "youtube";

export default function StreamsPage() {
  const toast = useToast();
  
  // Tab State
  const [activeTab, setActiveTab] = useState<TabType>("visual");

  // YouTube Restream States
  const [ytEnabled, setYtEnabled] = useState(false);
  const [keyConfigured, setKeyConfigured] = useState(false);
  const [engineOnline, setEngineOnline] = useState<boolean | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [savedEnabled, setSavedEnabled] = useState(false);
  const [youtubeConnecting, setYoutubeConnecting] = useState(false);
  const dirty = useRef(false);
  const saving = useRef(false);
  const requestVersion = useRef(0);
  const [vmixOnline, setVmixOnline] = useState<boolean | null>(null);
  const [youtubeStreaming, setYoutubeStreaming] = useState<boolean | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // YouTube OAuth integration states
  const [ytOAuth, setYtOAuth] = useState<{
    connected: boolean;
    channelTitle?: string;
    streams: Array<{ id: string; title: string; streamKey?: string | null; streamStatus?: string }>;
    broadcasts?: Array<{ id: string; title: string; lifeCycleStatus?: string }>;
  } | null>(null);
  const [selectedStreamId, setSelectedStreamId] = useState<string>("");
  const [activeWatchUrl, setActiveWatchUrl] = useState<string | null>(null);

  // Monitor State
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  // Helper sync state
  const applyStreamData = useCallback((data: {
    youtube_enabled?: boolean;
    youtube_key_configured?: boolean;
    youtube_connecting?: boolean;
    vmix_online?: boolean;
    youtube_streaming?: boolean;
    last_error?: string | null;
  }) => {
    if (data.youtube_enabled !== undefined) {
      setSavedEnabled(data.youtube_enabled);
      if (!dirty.current) setYtEnabled(data.youtube_enabled);
      setConfigLoaded(true);
    }
    setEngineOnline(true);
    setKeyConfigured(data.youtube_key_configured ?? false);
    setYoutubeConnecting(data.youtube_connecting ?? false);
    setVmixOnline(data.vmix_online ?? null);
    setYoutubeStreaming(data.youtube_streaming ?? false);
    setLastError(data.last_error || null);
  }, []);

  const markUnavailable = useCallback(() => {
    setEngineOnline(false); setVmixOnline(null); setYoutubeStreaming(null);
  }, []);

  const refresh = useCallback(async () => {
    if (saving.current) return;
    const version = ++requestVersion.current;
    try {
      const res = await fetch("/api/stream/sync", { cache: "no-store", signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error("Status API error");
      const data = await res.json();
      if (version === requestVersion.current && !saving.current) applyStreamData(data);
    } catch {
      if (version === requestVersion.current) markUnavailable();
    }
  }, [applyStreamData, markUnavailable]);

  const handleManualRefresh = async () => {
    setIsRefreshingStatus(true);
    await refresh();
    setIsRefreshingStatus(false);
  };

  useEffect(() => {
    const initial = setTimeout(() => void refresh(), 0);
    const invalidateRequests = () => { requestVersion.current++; };
    const timer = setInterval(() => void refresh(), 10000);
    return () => { clearTimeout(initial); clearInterval(timer); invalidateRequests(); };
  }, [refresh]);

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

  // 1. Kontrol langsung switch siaran YouTube ke server tanpa tombol simpan ganda
  const handleToggleYoutube = async (targetEnabled?: boolean) => {
    const nextState = targetEnabled !== undefined ? targetEnabled : !savedEnabled;
    if (nextState && !ytOAuth?.connected) {
      toast.push("Hubungkan akun YouTube terlebih dahulu.", "error");
      return;
    }
    if (saving.current) return;
    saving.current = true;
    requestVersion.current++;
    setIsSyncing(true);
    try {
      const res = await fetch("/api/stream/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          youtube_enabled: nextState,
        }),
        signal: AbortSignal.timeout(10000),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memperbarui status ke server");
      dirty.current = false;
      applyStreamData(data);

      // Otomatis buat / hidupkan Live Broadcast di channel YouTube jika OAuth terhubung
      if (nextState && ytOAuth?.connected) {
        try {
          const autoRes = await fetch("/api/youtube/auto-live", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "start",
              streamId: selectedStreamId || ytOAuth.streams[0]?.id,
            }),
          });
          const autoData = await autoRes.json();
          if (autoData.watchUrl) {
            setActiveWatchUrl(autoData.watchUrl);
          }
        } catch {
          // Non-fatal
        }
      } else if (!nextState && ytOAuth?.connected) {
        try {
          await fetch("/api/youtube/auto-live", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "stop" }),
          });
          setActiveWatchUrl(null);
        } catch {
          // Non-fatal
        }
      }

      toast.push(
        nextState
          ? "Siaran YouTube diaktifkan! Video studio disiarkan langsung ke channel YouTube."
          : "Siaran YouTube dinonaktifkan."
      );
    } catch (error) {
      toast.push(error instanceof Error ? error.message : "Terjadi gangguan jaringan", "error");
    } finally {
      saving.current = false;
      setIsSyncing(false);
    }
  };

  // 3. Pasang Stream Key otomatis dari YouTube OAuth Channel
  const handleApplyStreamKeyFromOAuth = async (key: string, title: string) => {
    if (!key.trim()) return;
    if (saving.current) return;
    saving.current = true;
    requestVersion.current++;
    setIsSyncing(true);
    try {
      const res = await fetch("/api/stream/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          youtube_enabled: savedEnabled,
          youtube_key: key.trim(),
        }),
        signal: AbortSignal.timeout(10000),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memasang Stream Key");
      dirty.current = false;
      applyStreamData(data);
      toast.push(`Jalur siaran "${title}" terpasang otomatis ke server!`);
    } catch (error) {
      toast.push(error instanceof Error ? error.message : "Gagal memasang Stream Key", "error");
    } finally {
      saving.current = false;
      setIsSyncing(false);
    }
  };

  // 4. Callback saat data OAuth YouTube berhasil dimuat
  const handleOAuthStatusLoaded = useCallback((data: {
    connected: boolean;
    channelTitle?: string;
    streams: Array<{ id: string; title: string; streamKey?: string | null; streamStatus?: string }>;
    broadcasts?: Array<{ id: string; title: string; lifeCycleStatus?: string }>;
  }) => {
    setYtOAuth(data);
    const liveItem = data.broadcasts?.find(b => b.lifeCycleStatus === "live" || b.lifeCycleStatus === "testing" || b.lifeCycleStatus === "ready");
    if (liveItem) {
      setActiveWatchUrl(`https://www.youtube.com/watch?v=${liveItem.id}`);
    } else {
      setActiveWatchUrl(null);
    }
    if (data.connected && data.streams.length > 0) {
      const defaultStream = data.streams.find(s => s.title.toLowerCase().includes("default")) || data.streams[0];
      if (defaultStream) {
        setSelectedStreamId(prev => prev || defaultStream.id);
        // Jika server belum disetel key, pasang otomatis default stream key tanpa perlu user klik apa pun
        if (!keyConfigured && defaultStream.streamKey && !saving.current) {
          void handleApplyStreamKeyFromOAuth(defaultStream.streamKey, defaultStream.title);
        }
      }
    }
  }, [keyConfigured]);

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

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* ── HEADER RINGKAS & RAMAH ── */}
      <PageHeader
        title="Studio Siaran Multiplatform"
        badge={<Badge tone={engineOnline ? "success" : "muted"}>{engineOnline === null ? "Memeriksa Server" : engineOnline ? "Server Terhubung" : "Server Tidak Terjangkau"}</Badge>}
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
          {savedEnabled && <span className="h-2 w-2 rounded-full bg-live animate-pulse" />}
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
                  Buka vMix, klik ikon gear pada menu <b>Stream</b>, lalu pilih <b>Custom RTMP Server</b>, lalu isi data berikut:
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
                  <p>Gunakan H.264 Baseline, B-frame 0, 25/30 fps, keyframe 2 detik dan audio AAC 48 kHz stereo. Resolusi dan bitrate mengikuti kapasitas upload studio.</p>
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
              </CardHeader>
              <div className="p-4 pt-0">
                <StreamPreview />
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

      {/* ── TAB 3: YOUTUBE LIVE RESTREAM (2-COLUMN GRID) ── */}
      {activeTab === "youtube" && (
        <div className="grid lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
          
          {/* KOLOM KIRI (5 KOLOM): TRANSMISI CLOUD & MONITOR STUDIO */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="border border-border shadow-sm">
              <CardHeader className="border-b border-border/60 pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Cast className="h-5 w-5 text-live" />
                    Transmisi ke YouTube
                  </CardTitle>
                  {youtubeStreaming ? (
                    <Badge tone="live" pulse>LIVE DI YOUTUBE</Badge>
                  ) : savedEnabled && !vmixOnline ? (
                    <Badge tone="warning">STANDBY</Badge>
                  ) : (
                    <Badge tone="muted">OFFLINE</Badge>
                  )}
                </div>
                <CardDescription className="text-xs">
                  Meneruskan video vMix studio langsung ke YouTube Live dari server cloud Azure tanpa membebani kuota laptop.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 pt-4">
                {/* Panel Status Sinyal Real-time */}
                <div className="p-3.5 rounded-xl bg-card border border-border/80 space-y-3 shadow-xs">
                  {/* Sinyal Ingest vMix */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${vmixOnline ? "bg-success animate-pulse" : "bg-muted-foreground/40"}`} />
                      Sinyal Studio (vMix):
                    </span>
                    {vmixOnline === null ? (
                      <Badge tone="muted" className="text-[10px]">Memeriksa...</Badge>
                    ) : vmixOnline ? (
                      <Badge tone="success" pulse className="text-[10px]">Online (Mengudara)</Badge>
                    ) : (
                      <Badge tone="muted" className="text-[10px]">Offline (Siaga)</Badge>
                    )}
                  </div>

                  {/* Restream YouTube */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${youtubeStreaming ? "bg-live animate-pulse" : savedEnabled ? "bg-warning" : "bg-muted-foreground/40"}`} />
                      Push YouTube Live:
                    </span>
                    {youtubeStreaming ? (
                      <Badge tone="danger" pulse className="text-[10px]">Data Terkirim</Badge>
                    ) : youtubeConnecting ? (
                      <Badge tone="warning" className="text-[10px]">Menghubungkan...</Badge>
                    ) : savedEnabled && !vmixOnline ? (
                      <Badge tone="warning" className="text-[10px]">Standby (Tunggu vMix)</Badge>
                    ) : (
                      <Badge tone="muted" className="text-[10px]">Nonaktif</Badge>
                    )}
                  </div>

                  {/* Integrasi Channel YouTube Otomatis */}
                  {ytOAuth?.connected ? (
                    <div className="p-3 rounded-lg bg-success/10 border border-success/30 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                          Channel: {ytOAuth.channelTitle || "Sandi Ardiansyah"}
                        </span>
                        <Badge tone="success" className="text-[10px]">Otomatis Siap</Badge>
                      </div>
                      {ytOAuth.streams.length > 1 ? (
                        <div className="space-y-1 pt-1">
                          <label className="text-[11px] font-medium text-muted-foreground">Pilih Jalur Siaran YouTube:</label>
                          <select
                            value={selectedStreamId}
                            onChange={(e) => {
                              const newId = e.target.value;
                              setSelectedStreamId(newId);
                              const s = ytOAuth.streams.find(item => item.id === newId);
                              if (s?.streamKey) {
                                void handleApplyStreamKeyFromOAuth(s.streamKey, s.title);
                              }
                            }}
                            className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs font-semibold text-foreground"
                          >
                            {ytOAuth.streams.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.title.replace(/stream\s*key/gi, "Siaran").trim()} {s.title.toLowerCase().includes("default") ? "(Utama)" : ""} {s.streamStatus === "active" ? "🟢 Live" : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground">
                          Jalur transmisi video siap mengudara ke channel YouTube Anda.
                        </p>
                      )}
                    </div>
                  ) : null}

                  {/* Banner Tautan Tayangan Langsung YouTube */}
                  {activeWatchUrl && (
                    <a
                      href={activeWatchUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-3 rounded-lg bg-live/15 border border-live/30 text-live hover:bg-live/25 transition-all text-xs font-semibold shadow-xs"
                    >
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-live animate-ping" />
                        Tayangan Siaran Aktif di YouTube
                      </span>
                      <span className="inline-flex items-center gap-1 underline text-[11px]">
                        Tonton Video <ExternalLink className="h-3 w-3" />
                      </span>
                    </a>
                  )}

                  {/* Kontrol Siaran: Hanya muncul setelah akun YouTube terhubung (OAuth) */}
                  {!ytOAuth?.connected ? (
                    <div className="pt-2 border-t border-border/40">
                      <div className="p-3 rounded-lg bg-muted/40 border border-border/70 text-center space-y-1">
                        <p className="text-xs font-semibold text-foreground">
                          Siaran YouTube Memerlukan Akun
                        </p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Hubungkan akun YouTube pada kartu di sebelah kanan untuk mengaktifkan siaran studio.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-border/40">
                      {savedEnabled ? (
                        <Button
                          variant="danger"
                          className="w-full h-11 font-semibold text-sm shadow-sm"
                          disabled={isSyncing}
                          onClick={() => handleToggleYoutube(false)}
                        >
                          <CircleStop className="mr-2 h-4 w-4" />
                          {isSyncing ? "Menyimpan ke Server..." : "Hentikan Siaran ke YouTube"}
                        </Button>
                      ) : (
                        <Button
                          variant="live"
                          className="w-full h-11 font-semibold text-sm shadow-md"
                          disabled={isSyncing}
                          onClick={() => handleToggleYoutube(true)}
                        >
                          <Radio className="mr-2 h-4 w-4" />
                          {isSyncing ? "Menghubungkan..." : "Mulai Siaran ke YouTube"}
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Auto refresh status bar */}
                  <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Auto-refresh setiap 10 detik</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleManualRefresh}
                      disabled={isRefreshingStatus}
                      className="h-6 text-xs px-2 text-muted-foreground hover:text-foreground"
                    >
                      <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshingStatus ? "animate-spin" : ""}`} />
                      Segarkan
                    </Button>
                  </div>
                </div>

                {lastError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-500">
                    <span className="font-semibold">Peringatan:</span> {lastError}
                  </div>
                )}

              </CardContent>
            </Card>
          </div>

          {/* KOLOM KANAN (7 KOLOM): MANAJEMEN YOUTUBE STUDIO */}
          <div className="lg:col-span-7 space-y-4">
            <YouTubeAccountManager
              onStatusLoaded={handleOAuthStatusLoaded}
              onSelectStreamKey={handleApplyStreamKeyFromOAuth}
            />
          </div>

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
