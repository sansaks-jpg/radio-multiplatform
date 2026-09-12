import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import {
  fetchRecentCommentsWithSession,
  sendLiveComment,
  getAdminApiUrl,
} from "../services/comments";
import type { LiveComment } from "../types";

const POLL_INTERVAL_MS = 2000;
const MAX_COMMENTS_LIMIT = 50;

export function useLiveComments(enabled: boolean) {
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const pendingSendsCount = useRef(0);
  const lastSendTime = useRef(0);
  const lastSessionRef = useRef<string | null>(null);

  // Initial load when opened
  const loadInitial = useCallback(async () => {
    setIsLoading(true);
    try {
      const { comments: data, sessionStartIso } = await fetchRecentCommentsWithSession(MAX_COMMENTS_LIMIT);
      lastSessionRef.current = sessionStartIso;
      setComments(data.slice(0, MAX_COMMENTS_LIMIT));
    } catch {
      // Ignored
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    void loadInitial();

    // 1. Jika di platform Web, manfaatkan EventSource SSE langsung
    if (Platform.OS === "web" && typeof window !== "undefined" && "EventSource" in window) {
      const es = new window.EventSource(`${getAdminApiUrl()}/api/comments/stream`);

      es.addEventListener("new", (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.comment) {
            setComments((prev) => {
              const exists = prev.some((c) => c.id === payload.comment.id);
              if (exists) return prev;
              return [payload.comment, ...prev].slice(0, MAX_COMMENTS_LIMIT);
            });
          }
        } catch {
          // Parse error
        }
      });

      es.addEventListener("update", (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.comment) {
            setComments((prev) =>
              prev.map((c) =>
                c.id === payload.comment.id ? payload.comment : c
              )
            );
          }
        } catch {
          // Parse error
        }
      });

      es.addEventListener("delete", (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.comment) {
            setComments((prev) =>
              prev.filter((c) => c.id !== payload.comment.id)
            );
          }
        } catch {
          // Parse error
        }
      });

      es.addEventListener("reset", () => {
        setComments([]);
      });

      return () => {
        es.close();
      };
    }

    // 2. Di platform Native Android / iOS: Smart reconciliation polling (2 detik)
    const syncNative = async () => {
      try {
        const { comments: fresh, sessionStartIso } = await fetchRecentCommentsWithSession(MAX_COMMENTS_LIMIT);

        // Jika sesi program siaran berganti, bersihkan riwayat komentar seketika
        if (sessionStartIso && sessionStartIso !== lastSessionRef.current) {
          lastSessionRef.current = sessionStartIso;
          setComments(fresh);
          return;
        }

        setComments((prev) => {
          if (prev.length === 0) return fresh;

          const sessionCutoff = sessionStartIso ? new Date(sessionStartIso).getTime() : 0;

          // Pertahankan optimistic comments lokal yang belum tersinkron
          const pendingOptimistic = prev.filter(
            (c) =>
              (c.id.startsWith("temp-") || c.id.startsWith("local-")) &&
              new Date(c.created_at).getTime() >= sessionCutoff
          );
          const freshIds = new Set(fresh.map((c) => c.id));
          const retainedPending = pendingOptimistic.filter(
            (c) => !freshIds.has(c.id)
          );

          return [...retainedPending, ...fresh].slice(0, MAX_COMMENTS_LIMIT);
        });
      } catch {
        // Safe fail
      }
    };

    const interval = setInterval(() => {
      void syncNative();
    }, POLL_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [enabled, loadInitial]);

  // Kirim komentar — asynchronous tanpa blocking interaksi pengguna
  const send = useCallback(
    async (message: string, userName: string, avatarSeed?: string | null) => {
      const text = message.trim();
      if (!text) return;

      // Throttle ringan (200ms) untuk mencegah double-tap spam tidak sengaja
      const now = Date.now();
      if (now - lastSendTime.current < 200) {
        return;
      }
      lastSendTime.current = now;

      pendingSendsCount.current += 1;
      setIsSending(true);

      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const optimisticComment: LiveComment = {
        id: tempId,
        user_name: userName,
        avatar_seed: avatarSeed ?? "me",
        message: text,
        created_at: new Date().toISOString(),
        is_highlighted: false,
        is_hidden: false,
        is_broadcaster: false,
      };

      // Optimistic update instan (maksimal 50)
      setComments((prev) => [optimisticComment, ...prev].slice(0, MAX_COMMENTS_LIMIT));

      try {
        const saved = await sendLiveComment({
          userName,
          message: text,
          avatarSeed,
        });

        // Replace tempId with actual id
        setComments((prev) =>
          prev.map((c) => (c.id === tempId ? saved : c))
        );
      } catch {
        // Biarkan pesan optimis tetap tampil di sesi lokal
      } finally {
        pendingSendsCount.current = Math.max(0, pendingSendsCount.current - 1);
        if (pendingSendsCount.current === 0) {
          setIsSending(false);
        }
      }
    },
    []
  );

  return {
    comments,
    isLoading,
    isSending,
    send,
    refetch: loadInitial,
  };
}
