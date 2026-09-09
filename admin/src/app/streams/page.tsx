"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, Copy, Radio, Save, Tv, Video, Cast, Check, RadioReceiver } from "lucide-react";
import { PageHeader, StatCard } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";

export default function StreamsPage() {
  const toast = useToast();
  
  // States
  const [ytEnabled, setYtEnabled] = useState(false);
  const [ytKey, setYtKey] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Monitor State
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(false);

  // Fetch initial config from Azure via Next.js API
  useEffect(() => {
    fetch("/api/stream/sync")
      .then((res) => res.json())
      .then((data) => {
        if (data.youtube_enabled !== undefined) {
          setYtEnabled(data.youtube_enabled);
          setYtKey(data.youtube_key || "");
        }
      })
      .catch(() => toast.push("Gagal terhubung ke Cloud Engine", "error"));
  }, [toast]);

  const copyText = (text: string, id: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.push(`${label} disalin ke clipboard`);
    setTimeout(() => setCopiedId(null), 2000);
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
        toast.push("Sistem Cloud berhasil disinkronisasi!");
      } else {
        toast.push("Gagal sinkronisasi ke Cloud", "error");
      }
    } catch {
      toast.push("Terjadi kesalahan jaringan", "error");
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
        // Cache bust to always get fresh stream
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
      const hlsUrl = "http://40.81.231.250:8888/live_visual_webrtc/index.m3u8";
      
      if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
        videoRef.current.src = hlsUrl;
        videoRef.current.play()
          .then(() => { setIsVideoPlaying(true); setIsVideoLoading(false); })
          .catch(() => { setIsVideoLoading(false); toast.push("Stream vMix offline", "error"); });
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
            hls.on(window.Hls.Events.ERROR, (event, data) => {
              if (data.fatal) {
                setIsVideoLoading(false);
                toast.push("Siaran Visual offline / HLS belum aktif", "error");
              }
            });
          }
        };
        document.body.appendChild(script);
      }
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <PageHeader
          title="Streaming Orchestrator"
          description="Pusat kendali ingest server independen untuk siaran Audio (RadioBOSS) dan Visual (vMix) beserta distribusi Cloud."
        />
        <div className="flex gap-2">
           <Badge tone="live" pulse>CLOUD ENGINE ONLINE</Badge>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Audio Server" value="Icecast" hint="Port 8000" tone="brand" icon={<Radio />} />
        <StatCard label="Visual Server" value="MediaMTX" hint="Port 1935" tone="orange" icon={<Video />} />
        <StatCard label="Cloud Hub" value="40.81.231.250" hint="Azure VM" tone="default" icon={<Activity />} />
        <StatCard label="YouTube Restream" value={ytEnabled ? "Aktif" : "Nonaktif"} hint="Direct Copy Engine" tone={ytEnabled ? "brand" : "default"} icon={<Cast />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* LEFT COLUMN: SETUP */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* CARD 1: RADIOBOSS */}
          <Card className="border border-border shadow-sm overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-brand"></div>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <RadioReceiver className="h-5 w-5 text-brand" /> 
                  1. Setup Audio (RadioBOSS)
                </CardTitle>
                {isAudioPlaying && <Badge tone="live" pulse>MONITOR AKTIF</Badge>}
              </div>
              <CardDescription>
                Masukkan ke <b>RadioBOSS / SAM Broadcaster</b> agar aplikasi membaca Metadata Judul Lagu otomatis.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/30 p-1">
                <CopyField label="Server IP" value="40.81.231.250" id="ip" copiedId={copiedId} onCopy={copyText} />
                <CopyField label="Port" value="8000" id="port" copiedId={copiedId} onCopy={copyText} />
                <CopyField label="Mount Point" value="/live" id="mount" copiedId={copiedId} onCopy={copyText} highlight />
                <CopyField label="Password" value="sourcepass123" id="pass" copiedId={copiedId} onCopy={copyText} isSecret />
              </div>
            </CardContent>
            <CardFooter className="bg-muted/10 border-t border-border pt-4">
              <Button variant={isAudioPlaying ? "outline" : "secondary"} className="w-full" onClick={toggleAudio}>
                {isAudioPlaying ? "Hentikan Pemutaran" : "Tes Putar Suara (Icecast)"}
              </Button>
              <audio ref={audioRef} className="hidden" />
            </CardFooter>
          </Card>

          {/* CARD 2: VMIX */}
          <Card className="border border-border shadow-sm overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-orange"></div>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Tv className="h-5 w-5 text-orange" /> 
                2. Setup Visual (vMix / OBS)
              </CardTitle>
              <CardDescription>
                Gunakan profil encoder <b>H.264 + AAC</b>. Cloud engine kami akan mengonversi audio ke WebRTC (Opus) secara real-time.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border bg-muted/30 p-1">
                <CopyField label="RTMP Server URL" value="rtmp://40.81.231.250:1935/" id="rtmp" copiedId={copiedId} onCopy={copyText} />
                <CopyField label="Stream Key" value="live_visual" id="streamkey" copiedId={copiedId} onCopy={copyText} highlight />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: PREVIEW & YOUTUBE */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* VISUAL MONITOR */}
          <Card className="border border-border shadow-sm overflow-hidden">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Live Visual Monitor</CardTitle>
                <CardDescription>Preview HLS/WebRTC dari siaran vMix Anda (Latensi Rendah).</CardDescription>
              </div>
              {isVideoPlaying && <Badge tone="live" pulse>LIVE</Badge>}
            </CardHeader>
            <div className="p-5 pt-0">
              <div className="aspect-video w-full rounded-xl bg-black overflow-hidden relative border border-border shadow-inner group">
                <video ref={videoRef} className="w-full h-full object-contain" controls playsInline />
                
                {!isVideoPlaying && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-10 transition-opacity">
                    <div className="p-4 rounded-full bg-muted/50 mb-4">
                      <Tv className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <Button variant="primary" onClick={testVisualStream} disabled={isVideoLoading} className="shadow-lg">
                      <PlayIcon className="mr-2 h-4 w-4" /> 
                      {isVideoLoading ? "Menghubungkan HLS..." : "Muat Siaran Visual"}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-4 max-w-xs text-center">
                      Pastikan studio vMix Anda sudah menyala dan mengirimkan stream sebelum memutar preview ini.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* YOUTUBE SETTINGS */}
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Cast className="h-5 w-5 text-red-500" /> YouTube Restreamer
              </CardTitle>
              <CardDescription>
                Meneruskan siaran dari vMix langsung ke YouTube tanpa membebani CPU komputer studio Anda.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 items-end bg-muted/20 p-4 rounded-lg border border-border">
                <div className="flex-1 space-y-2 w-full">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Stream Key YouTube</label>
                  <Input
                    type="password"
                    placeholder="Contoh: abcd-1234-efgh-5678"
                    value={ytKey}
                    onChange={(e) => setYtKey(e.target.value)}
                    className="font-mono"
                  />
                </div>
                <div className="flex w-full sm:w-auto gap-2">
                  <Button
                    variant={ytEnabled ? "danger" : "secondary"}
                    onClick={() => setYtEnabled(!ytEnabled)}
                    className="flex-1 sm:flex-none"
                  >
                    {ytEnabled ? "Matikan Push" : "Aktifkan Push"}
                  </Button>
                  <Button variant="primary" onClick={handleSyncYoutube} disabled={isSyncing} className="flex-1 sm:flex-none">
                    <Save className="mr-2 h-4 w-4" />
                    {isSyncing ? "Menyimpan..." : "Terapkan"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
        </div>
      </div>
    </div>
  );
}

// Komponen helper untuk field copy yang elegan
function CopyField({ 
  label, value, id, copiedId, onCopy, highlight = false, isSecret = false 
}: { 
  label: string; value: string; id: string; copiedId: string | null; onCopy: (v: string, id: string, l: string) => void; highlight?: boolean; isSecret?: boolean 
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50 transition-colors group cursor-pointer" onClick={() => onCopy(value, id, label)}>
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <span className={`text-sm font-mono ${highlight ? "font-bold text-brand" : "text-foreground"} ${isSecret ? "blur-sm group-hover:blur-none transition-all duration-300" : ""}`}>
          {value}
        </span>
        <div className={`text-muted-foreground transition-all duration-200 ${copiedId === id ? "text-success" : "group-hover:text-foreground"}`}>
          {copiedId === id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4 opacity-0 group-hover:opacity-100" />}
        </div>
      </div>
    </div>
  );
}

function PlayIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}
