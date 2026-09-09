"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  MessageSquare,
  Radio,
  Send,
  Sparkles,
  EyeOff,
  Eye,
  RefreshCw,
  Wifi,
  WifiOff,
  Copy,
  Check,
  Volume2,
  VolumeX,
  Search,
  ArrowDown,
  Reply,
  Tv,
  CheckCircle2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import type { LiveComment } from "@/lib/comments-bus";

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

// Preset template pesan siaran resmi penyiar
const PRESET_MESSAGES = [
  "🎙️ Halo pendengar Gaul FM! Kirim salam & request lagu kalian yuk!",
  "🎵 Request lagu apa nih yang pengen kamu dengerin di segmen ini?",
  "📻 Stay tuned di 87.8 FM Semarang! Suara paling gaul di udara!",
  "🏆 Kuis studio dibuka! Tulis jawaban kamu di kolom komentar sekarang!",
];

export default function LiveChatStudioPage() {
  const toast = useToast();

  const [comments, setComments] = useState<LiveComment[]>([]);
  const [filter, setFilter] = useState<"all" | "highlighted" | "hidden">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Auto-scroll & scroll states
  const [autoScroll, setAutoScroll] = useState(true);
  const [hasNewMessageBelow, setHasNewMessageBelow] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const composerInputRef = useRef<HTMLInputElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Copy state feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Live audio monitor
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  // Helper copy text (support secure and non-secure IP address context)
  const copyToClipboard = async (text: string, id: string, label = "Pesan") => {
    let success = false;
    if (typeof window !== "undefined" && navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        success = true;
      } catch {
        success = false;
      }
    }

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
      window.prompt("Salin manual:", text);
    }
  };

  // Scroll to bottom helper
  const scrollToBottom = useCallback((smooth = true) => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
      setHasNewMessageBelow(false);
    }
  }, []);

  // Handle manual scroll detection
  const handleScroll = () => {
    if (!chatScrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatScrollRef.current;
    const isBottom = scrollHeight - scrollTop - clientHeight < 60;
    if (isBottom) {
      setHasNewMessageBelow(false);
      setAutoScroll(true);
    } else {
      setAutoScroll(false);
    }
  };

  // Manual refresh
  const fetchComments = useCallback(async (showLoading = false) => {
    if (showLoading) setLoadingInitial(true);
    try {
      const res = await fetch("/api/comments?forAdmin=true&limit=50");
      const json = await res.json();
      if (json.success && Array.isArray(json.comments)) {
        setComments(json.comments.slice(-50));
      }
    } catch (err) {
      console.error("Error fetching comments:", err);
      toast.push("Gagal memuat obrolan", "error");
    } finally {
      setLoadingInitial(false);
    }
  }, [toast]);

  // Connect SSE
  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/comments?forAdmin=true&limit=50", { signal: controller.signal })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.comments)) {
          setComments(json.comments.slice(-50));
          setTimeout(() => scrollToBottom(false), 100);
        }
      })
      .catch((err) => {
        if ((err as Error).name !== "AbortError") {
          console.error("Error fetching comments:", err);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingInitial(false);
        }
      });

    const es = new EventSource("/api/comments/stream");
    eventSourceRef.current = es;

    es.onopen = () => {
      setConnected(true);
    };

    es.onerror = () => {
      setConnected(false);
    };

    es.addEventListener("new", (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.comment) {
          setComments((prev) => {
            const exists = prev.some((c) => c.id === payload.comment.id);
            if (exists) return prev;
            return [...prev, payload.comment].slice(-50);
          });

          // Check if auto-scroll is on or alert user
          if (chatScrollRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = chatScrollRef.current;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
            if (isNearBottom) {
              setTimeout(() => scrollToBottom(true), 50);
            } else {
              setHasNewMessageBelow(true);
            }
          }
        }
      } catch (err) {
        console.error("Error parsing new comment SSE:", err);
      }
    });

    es.addEventListener("update", (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.comment) {
          setComments((prev) =>
            prev.map((c) =>
              c.id === payload.comment.id ? payload.comment : c
            )
          );
        }
      } catch (err) {
        console.error("Error parsing update comment SSE:", err);
      }
    });

    es.addEventListener("delete", (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.comment) {
          setComments((prev) =>
            prev.map((c) =>
              c.id === payload.comment.id ? payload.comment : c
            )
          );
        }
      } catch (err) {
        console.error("Error parsing delete comment SSE:", err);
      }
    });

    return () => {
      controller.abort();
      es.close();
      eventSourceRef.current = null;
    };
  }, [scrollToBottom]);

  // Broadcaster message submit
  const handleSendBroadcaster = async (textToSend?: string) => {
    const text = (textToSend ?? inputText).trim();
    if (!text || sending) return;

    setSending(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_name: "Studio Gaul FM",
          avatar_seed: "studio",
          message: text,
          is_broadcaster: true,
        }),
      });
      const data = await res.json();
      if (data.success && data.comment) {
        setInputText("");
        setComments((prev) => {
          const exists = prev.some((c) => c.id === data.comment.id);
          if (exists) return prev;
          return [...prev, data.comment].slice(-50);
        });
        toast.push("Pesan studio terkirim ke listener!");
        setTimeout(() => scrollToBottom(true), 50);
      } else {
        toast.push(data.error || "Gagal mengirim pesan", "error");
      }
    } catch (err) {
      console.error("Failed to send broadcaster comment:", err);
      toast.push("Gangguan jaringan saat mengirim", "error");
    } finally {
      setSending(false);
    }
  };

  // Toggle Highlight (On Air)
  const handleToggleHighlight = async (id: string) => {
    const target = comments.find((c) => c.id === id);
    const nextState = !target?.is_highlighted;

    setComments((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_highlighted: nextState } : c))
    );

    try {
      const res = await fetch(`/api/comments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_highlight" }),
      });
      if (res.ok) {
        toast.push(
          nextState
            ? "⭐ Komentar disorot On Air di HP pendengar!"
            : "Sorotan On Air dilepas"
        );
      }
    } catch (err) {
      console.error("Failed to toggle highlight:", err);
      toast.push("Gagal mengubah status On Air", "error");
    }
  };

  // Toggle Hidden (Moderasi)
  const handleToggleHidden = async (id: string) => {
    const target = comments.find((c) => c.id === id);
    const nextState = !target?.is_hidden;

    setComments((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_hidden: nextState } : c))
    );

    try {
      const res = await fetch(`/api/comments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_hidden" }),
      });
      if (res.ok) {
        toast.push(nextState ? "Pesan disembunyikan" : "Pesan dipulihkan ke chat");
      }
    } catch (err) {
      console.error("Failed to toggle hidden:", err);
      toast.push("Gagal moderasi komentar", "error");
    }
  };

  // Quick reply
  const handleQuickReply = (userName: string) => {
    setInputText(`@${userName} `);
    composerInputRef.current?.focus();
  };

  // Toggle Live Audio Monitor
  const toggleAudio = () => {
    if (audioRef.current) {
      if (isAudioPlaying) {
        audioRef.current.pause();
        setIsAudioPlaying(false);
      } else {
        audioRef.current.src = `http://40.81.231.250:8000/live?t=${Date.now()}`;
        audioRef.current
          .play()
          .then(() => setIsAudioPlaying(true))
          .catch(() => toast.push("Stream RadioBOSS belum online", "error"));
      }
    }
  };

  // Counts
  const totalCount = comments.filter((c) => !c.is_hidden).length;
  const onAirComments = useMemo(
    () => comments.filter((c) => c.is_highlighted && !c.is_hidden),
    [comments]
  );
  const onAirCount = onAirComments.length;
  const hiddenCount = comments.filter((c) => c.is_hidden).length;

  // Filtered comments based on active tab and search
  const visibleComments = useMemo(() => {
    return comments.filter((c) => {
      // Tab filter
      if (filter === "highlighted" && (!c.is_highlighted || c.is_hidden)) return false;
      if (filter === "hidden" && !c.is_hidden) return false;
      if (filter === "all" && c.is_hidden) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = c.user_name.toLowerCase().includes(query);
        const matchesMsg = c.message.toLowerCase().includes(query);
        return matchesName || matchesMsg;
      }
      return true;
    });
  }, [comments, filter, searchQuery]);

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-12 px-1 sm:px-3">
      {/* ── HEADER DESKTOP (Elegan & Lengkap ala Streaming) ── */}
      <div className="hidden lg:flex items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-brand/10 border border-brand/30 flex items-center justify-center text-brand">
              <Radio className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Live Studio Chat Console
              </h1>
              <p className="text-xs text-muted-foreground">
                Interaksi real-time dengan pendengar mobile, sorot salam On Air, dan moderasi siaran studio.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Badge tone={connected ? "success" : "orange"} pulse={connected}>
            {connected ? (
              <span className="flex items-center gap-1.5 text-[11px] font-bold">
                <Wifi className="h-3 w-3" />
                SSE STREAMING LIVE
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[11px] font-bold">
                <WifiOff className="h-3 w-3" />
                MENGHUBUNGKAN...
              </span>
            )}
          </Badge>

          <span className="text-xs text-muted-foreground font-mono bg-muted/60 px-2.5 py-1 rounded-md border border-border/60">
            40.81.231.250
          </span>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => void fetchComments(true)}
            className="h-8 px-3 text-xs gap-1.5 border border-border/70 shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingInitial ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── HEADER MOBILE (Ultra Ringkas: Icon & Focus Chat) ── */}
      <div className="flex lg:hidden items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-7 w-7 rounded-md bg-brand/10 border border-brand/30 flex items-center justify-center text-brand shrink-0">
            <Radio className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-bold tracking-tight text-foreground truncate">
                Live Chat
              </h1>
              <span
                className={`h-2 w-2 rounded-full shrink-0 ${
                  connected ? "bg-emerald-500 animate-pulse" : "bg-orange animate-ping"
                }`}
                title={connected ? "Tersambung ke live SSE" : "Menghubungkan"}
              />
            </div>
          </div>
        </div>

        {/* Ringkasan Statistik Ikonik Khusus Mobile */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div
            className="flex items-center gap-1 bg-muted/50 border border-border/60 px-2 py-1 rounded-md text-[11px] font-semibold text-muted-foreground"
            title="Total Pesan Aktif"
          >
            <MessageSquare className="h-3.5 w-3.5 text-foreground/70" />
            <span>{totalCount}</span>
          </div>

          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold border transition-colors ${
              onAirCount > 0
                ? "bg-orange/15 border-orange/40 text-orange shadow-sm"
                : "bg-muted/50 border-border/60 text-muted-foreground"
            }`}
            title="Pesan On Air di Layar HP"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>{onAirCount}</span>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => void fetchComments(true)}
            className="h-7 w-7 p-0 shrink-0"
            title="Refresh obrolan"
          >
            <RefreshCw className={`h-3 w-3 ${loadingInitial ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* ── TAB NAVIGASI BESAR & JELAS (Segmented Control ala /streams) ── */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2 bg-muted/30 p-1 sm:p-1.5 rounded-xl border border-border/70 shadow-sm">
        <button
          onClick={() => setFilter("all")}
          className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-2 sm:px-4 rounded-lg font-semibold text-xs sm:text-sm transition-all ${
            filter === "all"
              ? "bg-background text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="truncate">Semua ({totalCount})</span>
        </button>

        <button
          onClick={() => setFilter("highlighted")}
          className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-2 sm:px-4 rounded-lg font-semibold text-xs sm:text-sm transition-all ${
            filter === "highlighted"
              ? "bg-orange text-white shadow-sm border border-orange"
              : "text-muted-foreground hover:text-orange hover:bg-muted/40"
          }`}
        >
          <Sparkles className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${filter === "highlighted" ? "text-white" : "text-orange"}`} />
          <span className="truncate">⭐ On Air ({onAirCount})</span>
        </button>

        <button
          onClick={() => setFilter("hidden")}
          className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-2 sm:px-4 rounded-lg font-semibold text-xs sm:text-sm transition-all ${
            filter === "hidden"
              ? "bg-background text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="truncate">Dimoderasi ({hiddenCount})</span>
        </button>
      </div>

      {/* ── MAIN LAYOUT: DESKTOP SPLIT (KIRI CHAT, KANAN INFORMASI) & MOBILE FULL CHAT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ═══════════════════════════════════════════════════════════
            KOLOM KIRI: LIVE CHAT CONSOLE UTAMA (Mobile 100%, Desktop lg:col-span-8)
            ═══════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-8 flex flex-col min-w-0">
          <Card className="border border-border shadow-sm flex flex-col overflow-hidden bg-card">
            {/* Toolbar Atas Chat Feed (Pencarian & Kontrol Auto-Scroll) */}
            <div className="p-3 sm:p-4 border-b border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              {/* Search Box */}
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Cari pendengar atau request lagu..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs bg-background/80"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-2 text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Status Info & Auto-Scroll Toggle */}
              <div className="flex items-center justify-between sm:justify-end gap-2 text-xs">
                <span className="text-muted-foreground text-[11px]">
                  {visibleComments.length} pesan ditampilkan
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const next = !autoScroll;
                    setAutoScroll(next);
                    if (next) scrollToBottom(true);
                  }}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                    autoScroll
                      ? "bg-brand/15 text-brand border border-brand/30"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                  title="Otomatis geser ke pesan paling baru saat ada komentar masuk"
                >
                  {autoScroll ? "● Auto-scroll Aktif" : "○ Auto-scroll Jeda"}
                </button>
              </div>
            </div>

            {/* Area Scroll Komentar */}
            <div className="relative">
              <div
                ref={chatScrollRef}
                onScroll={handleScroll}
                className="h-[calc(100vh-21rem)] min-h-[380px] sm:h-[520px] overflow-y-auto p-3 sm:p-4 space-y-3 overscroll-contain"
              >
                {loadingInitial ? (
                  <div className="flex flex-col items-center justify-center h-full py-16 text-muted-foreground text-xs gap-2">
                    <RefreshCw className="h-6 w-6 animate-spin text-brand" />
                    <span>Memuat obrolan siaran...</span>
                  </div>
                ) : visibleComments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-16 px-4 text-center">
                    <div className="h-12 w-12 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground mb-3">
                      <MessageSquare className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-bold text-foreground">
                      {searchQuery ? "Tidak ditemukan pesan yang cocok" : "Belum ada pesan siaran"}
                    </p>
                    <p className="text-xs text-muted-foreground max-w-sm mt-1">
                      {searchQuery
                        ? `Tidak ada komentar yang mengandung kata kunci "${searchQuery}".`
                        : filter === "highlighted"
                        ? "Belum ada komentar yang disorot On Air. Klik tombol bintang pada komentar pendengar."
                        : filter === "hidden"
                        ? "Tidak ada komentar yang disembunyikan / spam."
                        : "Kirim pesan pembuka dari studio di bawah untuk memantik obrolan pendengar!"}
                    </p>
                  </div>
                ) : (
                  visibleComments.map((item) => {
                    const isStudio = item.is_broadcaster;
                    const isHighlighted = item.is_highlighted;
                    const isHidden = item.is_hidden;

                    return (
                      <div
                        key={item.id}
                        className={`group relative rounded-xl border p-3 sm:p-3.5 transition-all text-left ${
                          isHighlighted
                            ? "border-orange/60 bg-orange/5 shadow-[0_0_16px_rgba(255,183,135,0.12)]"
                            : isStudio
                            ? "border-brand/40 bg-brand/5 shadow-sm"
                            : isHidden
                            ? "border-dashed border-border/60 bg-muted/30 opacity-60"
                            : "border-border/80 bg-surface-1 hover:border-border hover:bg-surface-2/60"
                        }`}
                      >
                        <div className="flex items-start gap-2.5 sm:gap-3">
                          {/* Avatar */}
                          <div
                            className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                              isStudio
                                ? "bg-brand text-brand-foreground shadow-sm"
                                : isHighlighted
                                ? "bg-orange text-white shadow-sm"
                                : "bg-muted text-muted-foreground border border-border/80"
                            }`}
                          >
                            {isStudio ? (
                              <Radio className="h-4 w-4" />
                            ) : (
                              item.user_name.slice(0, 2).toUpperCase()
                            )}
                          </div>

                          {/* Content Body */}
                          <div className="flex-1 min-w-0">
                            {/* Metadata Header Row */}
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                              <span className="text-xs sm:text-sm font-bold tracking-tight text-foreground truncate max-w-[140px] sm:max-w-[200px]">
                                {item.user_name}
                              </span>

                              {isStudio && (
                                <Badge tone="brand" className="text-[9px] px-1.5 py-0.5 font-black">
                                  STUDIO
                                </Badge>
                              )}

                              {isHighlighted && (
                                <Badge tone="orange" className="text-[9px] px-1.5 py-0.5 font-black animate-pulse">
                                  ⭐ ON AIR
                                </Badge>
                              )}

                              {isHidden && (
                                <Badge tone="muted" className="text-[9px] px-1.5 py-0.5">
                                  TERSEMBUNYI
                                </Badge>
                              )}

                              <span className="text-[10px] sm:text-xs text-muted-foreground ml-auto font-mono">
                                {formatTime(item.created_at)}
                              </span>
                            </div>

                            {/* Comment Message */}
                            <p className="text-xs sm:text-sm text-foreground/90 break-words leading-relaxed whitespace-pre-wrap">
                              {item.message}
                            </p>

                            {/* Action Bar (Tactile Buttons) */}
                            <div className="flex items-center gap-1 sm:gap-1.5 mt-2.5 pt-2 border-t border-border/40">
                              {/* Tombol Sorot On Air */}
                              <Button
                                variant={isHighlighted ? "orange" : "outline"}
                                size="sm"
                                onClick={() => handleToggleHighlight(item.id)}
                                className={`h-7 px-2 text-[11px] font-bold ${
                                  isHighlighted
                                    ? "bg-orange text-white hover:bg-orange/90"
                                    : "text-orange border-orange/30 hover:bg-orange/10"
                                }`}
                                title={isHighlighted ? "Lepas dari layar HP pendengar" : "Tampilkan mencolok di layar HP pendengar"}
                              >
                                <Sparkles className="h-3 w-3 mr-1" />
                                <span>{isHighlighted ? "On Air" : "Sorot On Air"}</span>
                              </Button>

                              {/* Tombol Balas Cepat */}
                              {!isStudio && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleQuickReply(item.user_name)}
                                  className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                                  title="Balas komentar pendengar ini"
                                >
                                  <Reply className="h-3 w-3 mr-1" />
                                  <span>Balas</span>
                                </Button>
                              )}

                              {/* Tombol Salin Teks */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(item.message, item.id, "Isi salam")}
                                className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                                title="Salin naskah salam ini untuk dibaca saat siaran"
                              >
                                {copiedId === item.id ? (
                                  <>
                                    <Check className="h-3 w-3 mr-1 text-success" />
                                    <span className="text-success font-semibold">Tersalin</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3 w-3 mr-1" />
                                    <span>Salin</span>
                                  </>
                                )}
                              </Button>

                              {/* Tombol Sembunyikan / Pulihkan */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleHidden(item.id)}
                                className="h-7 px-2 text-[11px] text-muted-foreground hover:text-danger ml-auto"
                                title={isHidden ? "Tampilkan kembali komentar" : "Sembunyikan pesan spam/kasar"}
                              >
                                {isHidden ? (
                                  <>
                                    <Eye className="h-3 w-3 mr-1 text-success" />
                                    <span className="text-success">Pulihkan</span>
                                  </>
                                ) : (
                                  <>
                                    <EyeOff className="h-3 w-3 mr-1" />
                                    <span className="hidden sm:inline">Sembunyikan</span>
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Floating Alert: Pesan Baru Masuk saat User Sedang Scroll di Atas */}
              {hasNewMessageBelow && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => scrollToBottom(true)}
                    className="h-8 px-3.5 text-xs font-bold shadow-lg animate-bounce gap-1.5 rounded-full"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                    Ada Pesan Baru Masuk
                  </Button>
                </div>
              )}
            </div>

            {/* ── BROADCASTER COMPOSER DI BAWAH FEED ── */}
            <div className="p-3 sm:p-4 border-t border-border/80 bg-surface-1 space-y-2.5">
              {/* Preset Chips (Template Siaran Cepat 1-Klik) */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
                <span className="text-[11px] font-semibold text-muted-foreground shrink-0 flex items-center gap-1">
                  <Radio className="h-3 w-3 text-brand" /> Cepat:
                </span>
                {PRESET_MESSAGES.map((msg, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setInputText(msg)}
                    className="shrink-0 bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60 rounded-full px-2.5 py-0.5 text-[11px] transition-colors truncate max-w-[220px]"
                    title={msg}
                  >
                    {msg}
                  </button>
                ))}
              </div>

              {/* Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSendBroadcaster();
                }}
                className="flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <Input
                    ref={composerInputRef}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Kirim pesan resmi studio ke HP pendengar..."
                    maxLength={300}
                    disabled={sending}
                    className="h-10 text-xs sm:text-sm bg-background border-border/80 focus:border-brand pr-12"
                  />
                  <span className="absolute right-2.5 top-3 text-[10px] text-muted-foreground font-mono">
                    {inputText.length}/300
                  </span>
                </div>

                <Button
                  type="submit"
                  disabled={!inputText.trim() || sending}
                  variant="primary"
                  className="h-10 px-3.5 sm:px-4 text-xs font-bold gap-1.5 shrink-0"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{sending ? "Kirim..." : "Kirim"}</span>
                </Button>
              </form>
            </div>
          </Card>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            KOLOM KANAN: PANEL INFORMASI SIARAN (Desktop: lg:col-span-4, Mobile: Sembunyi / Minimalis)
            ═══════════════════════════════════════════════════════════ */}
        <div className="hidden lg:flex lg:col-span-4 flex-col gap-4">
          {/* DECK 1: 🌟 SEDANG ON AIR DI LAYAR HP PENDENGAR */}
          <Card className="border border-orange/40 bg-gradient-to-b from-orange/10 via-card to-card shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-orange">
                  <Sparkles className="h-4 w-4" />
                  Sedang On Air di Layar HP
                </CardTitle>
                <Badge tone="orange" pulse={onAirCount > 0}>
                  {onAirCount > 0 ? "LIVE ON AIR" : "IDLE"}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Komentar berikut tampil di banner atas video/audio di seluruh HP pendengar.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {onAirComments.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-border/80 bg-muted/20 text-center space-y-2">
                  <div className="h-9 w-9 rounded-full bg-orange/10 text-orange flex items-center justify-center mx-auto">
                    <Tv className="h-4 w-4" />
                  </div>
                  <p className="text-xs font-semibold text-foreground">
                    Belum ada salam yang disorot
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Klik tombol <b>&quot;Sorot On Air&quot;</b> pada komentar di sebelah kiri untuk mengangkat salam pendengar ke siaran.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                  {onAirComments.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-lg border border-orange/50 bg-background/90 shadow-sm space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-foreground truncate max-w-[150px]">
                          {c.user_name}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {formatTime(c.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-foreground/90 italic leading-relaxed border-l-2 border-orange pl-2">
                        &ldquo;{c.message}&rdquo;
                      </p>
                      <div className="flex items-center justify-between pt-1 text-[11px]">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(c.message, `deck-${c.id}`, "Teks On Air")}
                          className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Salin Naskah
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleHighlight(c.id)}
                          className="h-6 px-2 text-[10px] text-orange hover:bg-orange/10 font-bold"
                        >
                          Lepas Sorotan
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* DECK 2: 📻 MONITOR SUARA STUDIO (ICECAST AUDIO LIVE) */}
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <Radio className="h-4 w-4 text-brand" />
                  Monitor Suara Radio
                </CardTitle>
                {isAudioPlaying && <Badge tone="live" pulse>SUARA AKTIF</Badge>}
              </div>
              <CardDescription className="text-xs">
                Dengarkan live audio siaran 87.8 FM langsung dari browser Anda.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-foreground">RadioBOSS Live Stream</p>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    http://40.81.231.250:8000/live
                  </p>
                </div>
                <Button
                  variant={isAudioPlaying ? "outline" : "primary"}
                  size="sm"
                  onClick={toggleAudio}
                  className="h-8 px-3 text-xs font-semibold gap-1.5 shrink-0"
                >
                  {isAudioPlaying ? (
                    <>
                      <VolumeX className="h-3.5 w-3.5" />
                      Mute
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-3.5 w-3.5" />
                      Putar
                    </>
                  )}
                </Button>
              </div>
              <audio ref={audioRef} className="hidden" />
            </CardContent>
          </Card>

          {/* DECK 3: 📊 STATISTIK SIARAN & TIPS OPERATOR */}
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-brand" />
                Status & Panduan Siaran
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs text-muted-foreground leading-relaxed">
              <div className="grid grid-cols-2 gap-2 pb-2 border-b border-border/60">
                <div className="bg-muted/30 p-2 rounded-lg border border-border/60">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Aktif Hari Ini</p>
                  <p className="text-lg font-extrabold text-foreground">{totalCount}</p>
                </div>
                <div className="bg-muted/30 p-2 rounded-lg border border-border/60">
                  <p className="text-[10px] uppercase font-bold text-orange">Sorot On Air</p>
                  <p className="text-lg font-extrabold text-orange">{onAirCount}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="flex items-start gap-1.5">
                  <span className="text-brand font-bold">•</span>
                  <span>
                    <b>Tips On Air:</b> Pesan yang disorot akan otomatis muncul di bagian atas video visual radio seluruh pendengar.
                  </span>
                </p>
                <p className="flex items-start gap-1.5">
                  <span className="text-brand font-bold">•</span>
                  <span>
                    <b>Filter Spam:</b> Gunakan tombol <b>Sembunyikan</b> jika ada kata-kata kasar/iklan liar untuk menjaga studio tetap kondusif.
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
