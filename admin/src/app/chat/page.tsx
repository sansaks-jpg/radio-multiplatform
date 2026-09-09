"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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
} from "lucide-react";
import { PageHeader, StatCard, EmptyState } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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

export default function LiveChatStudioPage() {
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [filter, setFilter] = useState<"all" | "highlighted" | "hidden">("all");
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Manual refresh helper
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
    } finally {
      setLoadingInitial(false);
    }
  }, []);

  // Connect to SSE stream
  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/comments?forAdmin=true&limit=50", { signal: controller.signal })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.comments)) {
          setComments(json.comments.slice(-50));
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
  }, []);

  // Send Broadcaster Message
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
      }
    } catch (err) {
      console.error("Failed to send broadcaster comment:", err);
    } finally {
      setSending(false);
    }
  };

  // Toggle Highlight (On Air)
  const handleToggleHighlight = async (id: string) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, is_highlighted: !c.is_highlighted } : c
      )
    );
    try {
      await fetch(`/api/comments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_highlight" }),
      });
    } catch (err) {
      console.error("Failed to toggle highlight:", err);
    }
  };

  // Toggle Hidden (Moderation)
  const handleToggleHidden = async (id: string) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, is_hidden: !c.is_hidden } : c
      )
    );
    try {
      await fetch(`/api/comments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_hidden" }),
      });
    } catch (err) {
      console.error("Failed to toggle hidden:", err);
    }
  };

  const visibleComments = comments.filter((c) => {
    if (filter === "highlighted") return c.is_highlighted && !c.is_hidden;
    if (filter === "hidden") return c.is_hidden;
    return !c.is_hidden;
  });

  const totalCount = comments.filter((c) => !c.is_hidden).length;
  const onAirCount = comments.filter((c) => c.is_highlighted && !c.is_hidden).length;
  const hiddenCount = comments.filter((c) => c.is_hidden).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Studio Chat"
        description="Moderasi interaksi live pendengar, sorot salam On Air, dan balas langsung dari studio."
        actions={
          <div className="flex items-center gap-3">
            <Badge tone={connected ? "success" : "orange"} className="flex items-center gap-1.5 px-2.5 py-1">
              {connected ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <Wifi className="h-3.5 w-3.5" />
                  <span className="text-[11px] font-bold">SSE Streaming Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5" />
                  <span className="text-[11px] font-bold">Menghubungkan...</span>
                </>
              )}
            </Badge>

            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchComments(true)}
              className="gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Komentar Aktif"
          value={totalCount}
          hint="Pesan pendengar hari ini"
          icon={<MessageSquare className="h-5 w-5" />}
        />
        <StatCard
          label="Sorotan On Air"
          value={onAirCount}
          hint="Ditandai lencana On Air di HP pendengar"
          tone="orange"
          icon={<Sparkles className="h-5 w-5 text-orange" />}
        />
        <StatCard
          label="Pesan Disembunyikan"
          value={hiddenCount}
          hint="Dimoderasi / spam"
          icon={<EyeOff className="h-5 w-5" />}
        />
      </div>

      {/* Studio Broadcaster Quick Composer */}
      <Card className="border-brand/20 bg-gradient-to-r from-brand/5 via-transparent to-transparent p-4">
        <form onSubmit={handleSendBroadcaster} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-sm font-bold text-brand">
            <Radio className="h-4 w-4" />
            <span>Studio Broadcaster:</span>
          </div>
          <div className="flex-1">
            <Input
              placeholder="Ketik pesan resmi studio (misal: 'Halo pendengar gaul, request lagu apa sore ini?')..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              maxLength={300}
              disabled={sending}
            />
          </div>
          <Button
            type="submit"
            disabled={!inputText.trim() || sending}
            className="gap-2 bg-brand text-brand-foreground hover:bg-brand/90 shrink-0"
          >
            <Send className="h-4 w-4" />
            {sending ? "Mengirim..." : "Kirim ke Listener"}
          </Button>
        </form>
      </Card>

      {/* Chat stream filter tabs */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              filter === "all"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Semua Pesan ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("highlighted")}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              filter === "highlighted"
                ? "bg-orange text-white"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            ⭐ On Air ({onAirCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("hidden")}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              filter === "hidden"
                ? "bg-muted-foreground text-background"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Disembunyikan ({hiddenCount})
          </button>
        </div>
        <p className="text-xs text-muted-foreground hidden sm:block">
          Auto-scroll real-time aktif
        </p>
      </div>

      {/* Messages list */}
      <div className="space-y-3">
        {loadingInitial ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Memuat obrolan siaran...
          </div>
        ) : visibleComments.length === 0 ? (
          <EmptyState
            title="Belum ada komentar"
            description={
              filter === "highlighted"
                ? "Belum ada komentar yang disorot On Air. Klik tombol 'Sorot On Air' pada komentar pendengar."
                : filter === "hidden"
                ? "Tidak ada komentar yang disembunyikan."
                : "Belum ada pesan dari pendengar. Kirim pesan pemantik dari studio di atas!"
            }
          />
        ) : (
          visibleComments
            .slice()
            .reverse()
            .map((item) => {
              const isStudio = item.is_broadcaster;
              return (
                <div
                  key={item.id}
                  className={`flex flex-col gap-2 rounded-xl border p-4 transition-all sm:flex-row sm:items-center sm:justify-between ${
                    item.is_highlighted
                      ? "border-orange/60 bg-orange/5 shadow-[0_0_15px_rgba(255,107,0,0.1)]"
                      : isStudio
                      ? "border-brand/50 bg-brand/5"
                      : item.is_hidden
                      ? "border-dashed border-border opacity-50 bg-muted/20"
                      : "border-border bg-card hover:border-border/80"
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                        isStudio
                          ? "bg-brand text-brand-foreground"
                          : item.is_highlighted
                          ? "bg-orange text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {item.user_name.slice(0, 2).toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-extrabold tracking-tight">
                          {item.user_name}
                        </span>

                        {isStudio ? (
                          <Badge tone="brand" className="text-[10px] uppercase font-black tracking-wider">
                            Studio
                          </Badge>
                        ) : null}

                        {item.is_highlighted ? (
                          <Badge tone="orange" className="text-[10px] uppercase font-black tracking-wider animate-pulse">
                            ⭐ On Air
                          </Badge>
                        ) : null}

                        {item.is_hidden ? (
                          <Badge tone="default" className="text-[10px] uppercase font-semibold">
                            Disembunyikan
                          </Badge>
                        ) : null}

                        <span className="text-xs text-muted-foreground">
                          {formatTime(item.created_at)}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-foreground/90 break-words leading-relaxed">
                        {item.message}
                      </p>
                    </div>
                  </div>

                  {/* Moderation Actions */}
                  <div className="flex items-center gap-2 pt-2 sm:pt-0 sm:pl-4">
                    <Button
                      variant={item.is_highlighted ? "orange" : "outline"}
                      size="sm"
                      onClick={() => handleToggleHighlight(item.id)}
                      className={`gap-1 text-xs font-bold ${
                        item.is_highlighted
                          ? "bg-orange text-white hover:bg-orange/90"
                          : "text-orange border-orange/40 hover:bg-orange/10"
                      }`}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {item.is_highlighted ? "Batal Sorot" : "Sorot On Air"}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleHidden(item.id)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                      title={item.is_hidden ? "Pulihkan pesan" : "Sembunyikan pesan"}
                    >
                      {item.is_hidden ? (
                        <>
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Pulihkan
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3.5 w-3.5 mr-1" />
                          Hide
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })
        )}
      </div>
    </div>
  );
}
