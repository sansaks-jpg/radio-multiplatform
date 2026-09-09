import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import {
  fetchRecentComments,
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

  // Initial load when opened
  const loadInitial = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchRecentComments(MAX_COMMENTS_LIMIT);
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

      return () => {
        es.close();
      };
    }

    // 2. Di platform Native Android / iOS: Smart reconciliation polling (2 detik)
    const syncNative = async () => {
      try {
        const fresh = await fetchRecentComments(MAX_COMMENTS_LIMIT);
        if (fresh && fresh.length > 0) {
          setComments((prev) => {
            if (prev.length === 0) return fresh;

            // Pertahankan optimistic comments lokal yang belum tersimpan
            const pendingOptimistic = prev.filter((c) =>
              c.id.startsWith("temp-")
            );
            const freshIds = new Set(fresh.map((c) => c.id));
            const retainedPending = pendingOptimistic.filter(
              (c) => !freshIds.has(c.id)
            );

            return [...retainedPending, ...fresh].slice(0, MAX_COMMENTS_LIMIT);
          });
        }
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

  // Kirim komentar
  const send = useCallback(
    async (message: string, userName: string, avatarSeed?: string | null) => {
      const text = message.trim();
      if (!text || isSending) return;

      setIsSending(true);
      const tempId = `temp-${Date.now()}`;
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

      // Optimistic update (maksimal 50)
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
        setIsSending(false);
      }
    },
    [isSending]
  );

  return {
    comments,
    isLoading,
    isSending,
    send,
    refetch: loadInitial,
  };
}
