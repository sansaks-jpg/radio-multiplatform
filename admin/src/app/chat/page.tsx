"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Radio,
  Send,
  Sparkles,
  EyeOff,
  Eye,
  RefreshCw,
  Copy,
  Check,
  ArrowDown,
} from "lucide-react";
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

// Warna avatar acak konsisten berdasarkan nama pengirim
const AVATAR_COLORS = [
  "bg-emerald-600 text-white",
  "bg-blue-600 text-white",
  "bg-violet-600 text-white",
  "bg-amber-600 text-white",
  "bg-rose-600 text-white",
  "bg-cyan-600 text-white",
  "bg-fuchsia-600 text-white",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function LiveChatStudioPage() {
  const toast = useToast();

  const [comments, setComments] = useState<LiveComment[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Auto-scroll control
  const [autoScroll, setAutoScroll] = useState(true);
  const [hasNewMessageBelow, setHasNewMessageBelow] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const composerInputRef = useRef<HTMLInputElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Feedback copied
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Helper copy text
  const copyToClipboard = async (text: string, id: string) => {
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
      toast.push("Pesan disalin!");
      setTimeout(() => setCopiedId(null), 2000);
    } else {
      window.prompt("Salin:", text);
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

  // Handle manual scroll
  const handleScroll = () => {
    if (!chatScrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatScrollRef.current;
    const isBottom = scrollHeight - scrollTop - clientHeight < 50;
    if (isBottom) {
      setHasNewMessageBelow(false);
      setAutoScroll(true);
    } else {
      setAutoScroll(false);
    }
  };

  // Fetch comments
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
      toast.push("Gagal memuat chat", "error");
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
          setTimeout(() => scrollToBottom(false), 80);
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

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    es.addEventListener("new", (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.comment) {
          setComments((prev) => {
            const exists = prev.some((c) => c.id === payload.comment.id);
            if (exists) return prev;
            return [...prev, payload.comment].slice(-50);
          });

          if (chatScrollRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = chatScrollRef.current;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
            if (isNearBottom) {
              setTimeout(() => scrollToBottom(true), 40);
            } else {
              setHasNewMessageBelow(true);
            }
          }
        }
      } catch (err) {
        console.error("Error parsing SSE:", err);
      }
    });

    es.addEventListener("update", (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.comment) {
          setComments((prev) =>
            prev.map((c) => (c.id === payload.comment.id ? payload.comment : c))
          );
        }
      } catch (err) {
        console.error("Error updating SSE:", err);
      }
    });

    es.addEventListener("delete", (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.comment) {
          setComments((prev) =>
            prev.map((c) => (c.id === payload.comment.id ? payload.comment : c))
          );
        }
      } catch (err) {
        console.error("Error deleting SSE:", err);
      }
    });

    return () => {
      controller.abort();
      es.close();
      eventSourceRef.current = null;
    };
  }, [scrollToBottom]);

  // Send studio message
  const handleSendBroadcaster = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
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
        setTimeout(() => scrollToBottom(true), 40);
      } else {
        toast.push(data.error || "Gagal mengirim pesan", "error");
      }
    } catch (err) {
      console.error("Failed sending comment:", err);
      toast.push("Gangguan jaringan", "error");
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
        toast.push(nextState ? "⭐ Disorot On Air di HP pendengar" : "Sorotan On Air dilepas");
      }
    } catch (err) {
      console.error("Failed toggle highlight:", err);
      toast.push("Gagal mengubah status On Air", "error");
    }
  };

  // Toggle Hidden
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
        toast.push(nextState ? "Pesan disembunyikan" : "Pesan dipulihkan");
      }
    } catch (err) {
      console.error("Failed toggle hidden:", err);
      toast.push("Gagal moderasi pesan", "error");
    }
  };

  const activeCommentsCount = comments.filter((c) => !c.is_hidden).length;
  const onAirCount = comments.filter((c) => c.is_highlighted && !c.is_hidden).length;

  return (
    <div className="-mx-4 -my-6 md:-mx-8 md:-my-8 h-[calc(100dvh-3.5rem)] flex flex-col bg-background text-foreground overflow-hidden">
      {/* ── HEADER SUPER SIMPEL (1 Baris Ringkas Tanpa Clutter) ── */}
      <header className="h-11 px-3 sm:px-5 border-b border-border/80 flex items-center justify-between shrink-0 bg-surface-1/90 backdrop-blur z-10">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`h-2.5 w-2.5 rounded-full shrink-0 ${
              connected ? "bg-emerald-500 animate-pulse" : "bg-orange"
            }`}
            title={connected ? "SSE Real-time Live" : "Menghubungkan"}
          />
          <h1 className="text-sm font-bold tracking-tight truncate">
            Live Chat
          </h1>
          <span className="text-xs text-muted-foreground font-mono">
            ({activeCommentsCount})
          </span>
          {onAirCount > 0 && (
            <Badge tone="orange" className="text-[10px] px-2 py-0.5 ml-1 font-bold animate-pulse">
              ⭐ {onAirCount} On Air
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              const next = !autoScroll;
              setAutoScroll(next);
              if (next) scrollToBottom(true);
            }}
            className={`text-[11px] px-2 py-1 rounded font-medium transition-colors ${
              autoScroll
                ? "bg-brand/15 text-brand"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {autoScroll ? "Auto-scroll" : "Scroll Jeda"}
          </button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => void fetchComments(true)}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            title="Refresh obrolan"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingInitial ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </header>

      {/* ── LIVE CHAT STREAM FEED (Single Clean Column Ala YouTube / Twitch) ── */}
      <div className="relative flex-1 min-h-0">
        <div
          ref={chatScrollRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto px-2 sm:px-4 py-2 space-y-0.5 divide-y divide-border/15 overscroll-contain"
        >
          {loadingInitial ? (
            <div className="flex flex-col items-center justify-center h-full text-xs text-muted-foreground gap-2">
              <RefreshCw className="h-5 w-5 animate-spin text-brand" />
              <span>Menghubungkan ke live chat...</span>
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4 text-xs text-muted-foreground">
              <Radio className="h-6 w-6 mb-2 text-muted-foreground/60" />
              <p className="font-semibold text-foreground text-sm">Belum ada obrolan</p>
              <p className="mt-0.5">Kirim pesan dari studio di bawah untuk menyapa pendengar!</p>
            </div>
          ) : (
            comments.map((item) => {
              const isStudio = item.is_broadcaster;
              const isHighlighted = item.is_highlighted;
              const isHidden = item.is_hidden;

              return (
                <div
                  key={item.id}
                  className={`group flex items-start gap-2.5 px-2 sm:px-3 py-2 transition-colors hover:bg-slate-100/80 ${
                    isHighlighted
                      ? "bg-orange/10 border-l-2 border-orange"
                      : isStudio
                      ? "bg-brand/10 border-l-2 border-brand"
                      : isHidden
                      ? "opacity-35 line-through bg-muted/20"
                      : ""
                  }`}
                >
                  {/* Avatar Bulat Mini */}
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                      isStudio
                        ? "bg-brand text-brand-foreground"
                        : isHighlighted
                        ? "bg-orange text-white"
                        : getAvatarColor(item.user_name)
                    }`}
                  >
                    {isStudio ? <Radio className="h-3.5 w-3.5" /> : item.user_name.slice(0, 2).toUpperCase()}
                  </div>

                  {/* Isi Obrolan Mengalir Bersih */}
                  <div className="flex-1 min-w-0 text-xs sm:text-sm leading-snug">
                    <span
                      className={`font-bold mr-1.5 ${
                        isStudio
                          ? "text-brand"
                          : isHighlighted
                          ? "text-orange"
                          : "text-foreground"
                      }`}
                    >
                      {item.user_name}
                    </span>

                    {isStudio && (
                      <span className="inline-block bg-brand/20 text-brand text-[9px] font-black px-1.5 py-0.2 rounded mr-1.5 uppercase tracking-wider">
                        Studio
                      </span>
                    )}

                    {isHighlighted && (
                      <span className="inline-block bg-orange/20 text-orange text-[9px] font-black px-1.5 py-0.2 rounded mr-1.5 uppercase tracking-wider animate-pulse">
                        ⭐ On Air
                      </span>
                    )}

                    <span className="text-foreground/90 break-words whitespace-pre-wrap">
                      {item.message}
                    </span>

                    <span className="text-[10px] text-muted-foreground/70 font-mono ml-2 inline-block">
                      {formatTime(item.created_at)}
                    </span>
                  </div>

                  {/* Tombol Aksi Moderasi Cepat */}
                  <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                    {/* Tombol Sorot On Air */}
                    <button
                      type="button"
                      onClick={() => handleToggleHighlight(item.id)}
                      className={`h-6 w-6 rounded flex items-center justify-center transition-colors ${
                        isHighlighted
                          ? "bg-orange text-white shadow-sm"
                          : "text-muted-foreground hover:text-orange hover:bg-orange/10"
                      }`}
                      title={isHighlighted ? "Lepas dari On Air" : "Sorot On Air di HP pendengar"}
                    >
                      <Sparkles className="h-3 w-3" />
                    </button>

                    {/* Tombol Salin */}
                    <button
                      type="button"
                      onClick={() => copyToClipboard(item.message, item.id)}
                      className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title="Salin salam pendengar"
                    >
                      {copiedId === item.id ? (
                        <Check className="h-3 w-3 text-success" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>

                    {/* Tombol Sembunyikan */}
                    <button
                      type="button"
                      onClick={() => handleToggleHidden(item.id)}
                      className={`h-6 w-6 rounded flex items-center justify-center transition-colors ${
                        isHidden
                          ? "text-success hover:bg-success/10"
                          : "text-muted-foreground hover:text-danger hover:bg-danger/10"
                      }`}
                      title={isHidden ? "Pulihkan pesan" : "Sembunyikan pesan"}
                    >
                      {isHidden ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Floating Button "Ada Pesan Baru Masuk" */}
        {hasNewMessageBelow && (
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20">
            <button
              type="button"
              onClick={() => scrollToBottom(true)}
              className="bg-brand text-brand-foreground text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 animate-bounce"
            >
              <ArrowDown className="h-3.5 w-3.5" />
              Pesan Baru
            </button>
          </div>
        )}
      </div>

      {/* ── COMPOSER INPUT MENEMPEL DI BAWAH (Fixed/Sticky Bottom) ── */}
      <footer className="p-2 sm:p-2.5 border-t border-border/80 bg-surface-1 shrink-0 z-10">
        <form onSubmit={handleSendBroadcaster} className="flex items-center gap-2">
          <Input
            ref={composerInputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ketik pesan resmi studio ke pendengar..."
            maxLength={300}
            disabled={sending}
            className="h-9 text-xs sm:text-sm bg-background border-border/70 focus:border-brand flex-1"
          />

          <Button
            type="submit"
            disabled={!inputText.trim() || sending}
            variant="primary"
            className="h-9 px-3.5 text-xs font-bold gap-1.5 shrink-0"
          >
            <Send className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{sending ? "..." : "Kirim"}</span>
          </Button>
        </form>
      </footer>
    </div>
  );
}
