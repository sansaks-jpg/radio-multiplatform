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

// Warna avatar konsisten berdasarkan palet studio
const AVATAR_COLORS = [
  "bg-brand-soft text-brand",
  "bg-accent-soft text-accent",
  "bg-live-soft text-live",
  "bg-warning-soft text-warning",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function LiveChatPage() {
  const toast = useToast();

  const [comments, setComments] = useState<LiveComment[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Floating jump-to-bottom control
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
      toast.push("Pesan berhasil disalin");
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Auto-scroll ke paling bawah
  const scrollToBottom = useCallback((force = false) => {
    if (!chatScrollRef.current) return;
    const el = chatScrollRef.current;
    if (force) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      setHasNewMessageBelow(false);
    } else {
      el.scrollTop = el.scrollHeight;
    }
  }, []);

  // Deteksi manual scroll pengguna
  const handleScroll = () => {
    if (!chatScrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatScrollRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 60;
    if (isAtBottom) {
      setHasNewMessageBelow(false);
    }
  };

  // Fetch initial comments
  const fetchComments = useCallback(async (isManual = false) => {
    try {
      if (isManual) setLoadingInitial(true);
      const res = await fetch("/api/comments?limit=50");
      const data = await res.json();
      if (data.comments) {
        setComments(data.comments);
        if (isManual) {
          toast.push("Komentar diperbarui");
        }
        setTimeout(() => scrollToBottom(true), 60);
      }
    } catch (err) {
      console.error("Gagal memuat komentar:", err);
      if (isManual) {
        toast.push("Gagal memuat pesan", "error");
      }
    } finally {
      setLoadingInitial(false);
    }
  }, [scrollToBottom, toast]);

  // Setup Server-Sent Events (SSE)
  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/comments?limit=50", { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (data.comments) {
          setComments(data.comments);
          setLoadingInitial(false);
          setTimeout(() => scrollToBottom(true), 80);
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Error initial comments:", err);
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

  // Kirim pesan resmi studio
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

  // Toggle Sorotan On-Air
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

  // Toggle Sembunyikan Pesan (Moderasi)
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

  const onAirCount = comments.filter((c) => c.is_highlighted && !c.is_hidden).length;
  const pinnedComment = comments.find((c) => c.is_highlighted && !c.is_hidden);

  return (
    <div className="mx-auto max-w-4xl h-[calc(100vh-5.5rem)] flex flex-col rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      {/* ── YOUTUBE LIVE CHAT HEADER (Ultra Minimalist) ── */}
      <div className="h-11 px-4 border-b border-border/80 flex items-center justify-between shrink-0 bg-muted/20 select-none">
        <div className="flex items-center gap-2.5">
          <span
            className={`h-2 w-2 rounded-full shrink-0 ${
              connected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
            }`}
            title={connected ? "Live Connected" : "Connecting"}
          />
          <h1 className="text-xs font-bold tracking-tight text-foreground uppercase">
            Live Chat
          </h1>
          {onAirCount > 0 && (
            <span className="text-[11px] font-semibold text-accent flex items-center gap-1 ml-1 animate-pulse">
              ⭐ {onAirCount} On Air
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => void fetchComments(true)}
          className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Muat ulang komentar"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loadingInitial ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* ── PINNED ON-AIR MESSAGE BANNER (Ala YouTube Pinned Message) ── */}
      {pinnedComment && (
        <div className="shrink-0 bg-accent-soft/75 border-b border-accent/30 px-4 py-2 flex items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-accent font-bold shrink-0 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="text-[11px] uppercase tracking-wider">Disorot On Air:</span>
            </span>
            <span className="font-semibold text-foreground truncate">
              {pinnedComment.user_name}:
            </span>
            <span className="text-foreground/90 truncate">
              {pinnedComment.message}
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleToggleHighlight(pinnedComment.id)}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground px-2 py-0.5 rounded hover:bg-muted transition-colors shrink-0"
            title="Lepas dari On Air"
          >
            Lepas
          </button>
        </div>
      )}

      {/* ── LIVE CHAT STREAM FEED (Single Column Ala YouTube Live) ── */}
      <div className="relative flex-1 min-h-0 bg-card">
        <div
          ref={chatScrollRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto px-4 py-2 space-y-1 overscroll-contain text-xs"
        >
          {loadingInitial ? (
            <div className="flex flex-col items-center justify-center h-full text-xs text-muted-foreground gap-2">
              <RefreshCw className="h-5 w-5 animate-spin text-brand" />
              <span>Menghubungkan ke live chat...</span>
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4 text-xs text-muted-foreground">
              <Radio className="h-6 w-6 mb-2 text-muted-foreground/50" />
              <p className="font-semibold text-foreground text-sm">Belum ada obrolan</p>
              <p className="mt-0.5">Kirim pesan di bawah untuk menyapa pendengar.</p>
            </div>
          ) : (
            comments.map((item) => {
              const isStudio = item.is_broadcaster;
              const isHighlighted = item.is_highlighted;
              const isHidden = item.is_hidden;

              return (
                <div
                  key={item.id}
                  className={`group relative flex items-start gap-2.5 px-2 py-1.5 rounded-md transition-colors ${
                    isHighlighted
                      ? "bg-accent-soft/40 border-l-2 border-accent"
                      : isStudio
                      ? "bg-brand-soft/30 border-l-2 border-brand"
                      : isHidden
                      ? "opacity-35 line-through hover:opacity-60"
                      : "hover:bg-muted/50"
                  }`}
                >
                  {/* Avatar Mini 24px */}
                  <div
                    className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 select-none ${
                      isStudio
                        ? "bg-brand text-brand-foreground"
                        : isHighlighted
                        ? "bg-accent text-accent-foreground"
                        : getAvatarColor(item.user_name)
                    }`}
                  >
                    {isStudio ? <Radio className="h-3 w-3" /> : item.user_name.slice(0, 2).toUpperCase()}
                  </div>

                  {/* Konten Pesan Inline Mengalir Ala YouTube */}
                  <div className="flex-1 min-w-0 leading-relaxed break-words">
                    {/* Timestamp */}
                    <span className="text-[10px] text-muted-foreground/70 font-mono mr-1.5 select-none">
                      {formatTime(item.created_at)}
                    </span>

                    {/* Nama Pengirim */}
                    <span
                      className={`font-semibold mr-1.5 ${
                        isStudio
                          ? "text-brand font-bold"
                          : isHighlighted
                          ? "text-accent font-bold"
                          : "text-foreground"
                      }`}
                    >
                      {item.user_name}
                    </span>

                    {/* Badge Studio */}
                    {isStudio && (
                      <span className="inline-block bg-brand-soft text-brand text-[9px] font-bold px-1.5 py-0.2 rounded mr-1.5 uppercase tracking-wider align-middle">
                        Studio
                      </span>
                    )}

                    {/* Badge On Air */}
                    {isHighlighted && (
                      <span className="inline-block bg-accent-soft text-accent text-[9px] font-bold px-1.5 py-0.2 rounded mr-1.5 uppercase tracking-wider align-middle animate-pulse">
                        ⭐ On Air
                      </span>
                    )}

                    {/* Teks Pesan */}
                    <span className="text-foreground/90 whitespace-pre-wrap">
                      {item.message}
                    </span>
                  </div>

                  {/* Quick Action Buttons saat Hover (YouTube Live Style) */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 shrink-0 pl-2">
                    <button
                      type="button"
                      onClick={() => handleToggleHighlight(item.id)}
                      className={`h-6 w-6 rounded flex items-center justify-center transition-colors ${
                        isHighlighted
                          ? "text-accent bg-accent-soft"
                          : "text-muted-foreground hover:text-accent hover:bg-muted"
                      }`}
                      title={isHighlighted ? "Lepas dari On Air" : "Sorot On Air di HP pendengar"}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => copyToClipboard(item.message, item.id)}
                      className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title="Salin pesan pendengar"
                    >
                      {copiedId === item.id ? (
                        <Check className="h-3.5 w-3.5 text-success" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleHidden(item.id)}
                      className={`h-6 w-6 rounded flex items-center justify-center transition-colors ${
                        isHidden
                          ? "text-success hover:bg-success-soft"
                          : "text-muted-foreground hover:text-danger hover:bg-danger-soft"
                      }`}
                      title={isHidden ? "Pulihkan pesan" : "Sembunyikan pesan"}
                    >
                      {isHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Floating Button "Ada Pesan Baru Masuk" (Ala YouTube) */}
        {hasNewMessageBelow && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20">
            <button
              type="button"
              onClick={() => scrollToBottom(true)}
              className="bg-card text-foreground border border-border shadow-md text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 hover:bg-muted transition-colors animate-bounce"
            >
              <ArrowDown className="h-3.5 w-3.5 text-brand" />
              <span>Pesan Baru</span>
            </button>
          </div>
        )}
      </div>

      {/* ── YOUTUBE LIVE COMPOSER INPUT (Clean Bottom Bar) ── */}
      <div className="p-3 border-t border-border/80 bg-muted/20 shrink-0">
        <form onSubmit={handleSendBroadcaster} className="flex items-center gap-2.5">
          {/* Avatar Studio */}
          <div className="h-7 w-7 rounded-full bg-brand text-brand-foreground flex items-center justify-center text-[10px] font-bold shrink-0 select-none">
            <Radio className="h-3.5 w-3.5" />
          </div>

          {/* Input Pill */}
          <input
            ref={composerInputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Kirim pesan sebagai Studio Gaul FM..."
            maxLength={300}
            disabled={sending}
            className="flex-1 h-9 px-4 text-xs bg-background border border-border rounded-full focus:outline-none focus:ring-1 focus:ring-brand placeholder:text-muted-foreground/60"
          />

          <Button
            type="submit"
            disabled={!inputText.trim() || sending}
            variant="primary"
            size="sm"
            className="h-9 px-4 rounded-full font-semibold gap-1.5 shrink-0"
          >
            <Send className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{sending ? "..." : "Kirim"}</span>
          </Button>
        </form>
      </div>
    </div>
  );
}
