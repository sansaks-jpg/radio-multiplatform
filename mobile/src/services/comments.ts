import { Platform } from "react-native";
import { getServerApiUrl } from "./apiConfig";
import { mockComments } from "../mocks/comments";
import type { LiveComment } from "../types";

export const MAX_LIVE_COMMENTS = 50;

const NETWORK_TIMEOUT_MS = 3500;

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = NETWORK_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

function getTargetUrls(): string[] {
  const primary = getServerApiUrl();
  const urls = [primary];
  if (
    __DEV__ &&
    Platform.OS === "android" &&
    (primary.includes("localhost") || primary.includes("127.0.0.1"))
  ) {
    urls.push("http://10.0.2.2:3000");
  }
  return urls;
}

export interface CommentsResult {
  comments: LiveComment[];
  sessionStartIso: string | null;
}

/**
 * Mengambil daftar komentar terbaru dari backend Next.js API.
 * Disaring sesuai batas program siaran aktif oleh server.
 */
export async function fetchRecentCommentsWithSession(
  limit = MAX_LIVE_COMMENTS
): Promise<CommentsResult> {
  const safeLimit = Math.min(limit, MAX_LIVE_COMMENTS);
  const urls = getTargetUrls();

  for (const baseUrl of urls) {
    try {
      const res = await fetchWithTimeout(`${baseUrl}/api/comments?limit=${safeLimit}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.comments)) {
          const list = json.comments.slice(-safeLimit).reverse() as LiveComment[];
          const sessionStartIso = json.session?.session_start ?? null;
          return { comments: list, sessionStartIso };
        }
      }
    } catch {
      // Coba endpoint berikutnya
    }
  }

  return { comments: mockComments.slice(0, safeLimit), sessionStartIso: null };
}

export async function fetchRecentComments(
  limit = MAX_LIVE_COMMENTS
): Promise<LiveComment[]> {
  const result = await fetchRecentCommentsWithSession(limit);
  return result.comments;
}

/**
 * Mengirim komentar baru melalui Next.js REST API.
 * Server akan meneruskannya ke Supabase dan memancarkan event ke SSE.
 */
export async function sendLiveComment(payload: {
  userName: string;
  message: string;
  avatarSeed?: string | null;
}): Promise<LiveComment> {
  const sendUrls = getTargetUrls();

  for (const baseUrl of sendUrls) {
    try {
      const res = await fetchWithTimeout(`${baseUrl}/api/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_name: payload.userName,
          message: payload.message,
          avatar_seed: payload.avatarSeed,
          is_broadcaster: false,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.comment) {
          return json.comment as LiveComment;
        }
      }
    } catch {
      // Coba endpoint berikutnya
    }
  }

  return {
    id: `local-${Date.now()}`,
    user_name: payload.userName,
    avatar_seed: payload.avatarSeed ?? "me",
    message: payload.message,
    created_at: new Date().toISOString(),
    is_highlighted: false,
    is_hidden: false,
    is_broadcaster: false,
  };
}

// Re-export getAdminApiUrl sebagai alias getServerApiUrl demi kompatibilitas
export const getAdminApiUrl = getServerApiUrl;
