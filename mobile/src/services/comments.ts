import { Platform } from "react-native";
import Constants from "expo-constants";
import { getSupabase, isSupabaseConfigured } from "./supabase";
import { mockComments } from "../mocks/comments";
import type { LiveComment } from "../types";

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;

export const DEFAULT_ADMIN_API_URL = "http://40.81.231.250:3001";

export function getAdminApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (
    typeof extra.adminApiUrl === "string" &&
    extra.adminApiUrl.startsWith("http")
  ) {
    return extra.adminApiUrl;
  }
  return DEFAULT_ADMIN_API_URL;
}

export const MAX_LIVE_COMMENTS = 50;

function getTargetUrls(): string[] {
  const primary = getAdminApiUrl();
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

/**
 * Mengambil daftar komentar terbaru dari Supabase atau Next.js API.
 * Jika offline/demo mode, kembalikan mock data (maksimal 50).
 */
export async function fetchRecentComments(
  limit = MAX_LIVE_COMMENTS
): Promise<LiveComment[]> {
  const safeLimit = Math.min(limit, MAX_LIVE_COMMENTS);
  const supabase = getSupabase();
  if (supabase && isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("live_comments")
        .select("*")
        .eq("is_hidden", false)
        .order("created_at", { ascending: false })
        .limit(safeLimit);

      if (!error && data) {
        return data as LiveComment[];
      }
    } catch {
      // Fallback ke REST API / mock
    }
  }

  // Coba REST endpoint dari admin
  const urls = getTargetUrls();

  for (const baseUrl of urls) {
    try {
      const res = await fetch(`${baseUrl}/api/comments?limit=${safeLimit}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.comments)) {
          return json.comments.slice(-safeLimit).reverse() as LiveComment[];
        }
      }
    } catch {
      // Coba endpoint berikutnya
    }
  }

  return mockComments.slice(0, safeLimit);
}

/**
 * Mengambil delta komentar baru setelah timestamp tertentu (sangat hemat bandwidth).
 */
export async function fetchDeltaComments(
  sinceIso: string
): Promise<LiveComment[]> {
  const supabase = getSupabase();
  if (supabase && isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("live_comments")
        .select("*")
        .eq("is_hidden", false)
        .gt("created_at", sinceIso)
        .order("created_at", { ascending: false });

      if (!error && data) {
        return data as LiveComment[];
      }
    } catch {
      return [];
    }
  }

  // Coba Next.js API
  const deltaUrls = getTargetUrls();

  for (const baseUrl of deltaUrls) {
    try {
      const res = await fetch(`${baseUrl}/api/comments?limit=50`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.comments)) {
          const sinceTime = new Date(sinceIso).getTime();
          const news = (json.comments as LiveComment[]).filter(
            (c) => new Date(c.created_at).getTime() > sinceTime
          );
          return news.reverse();
        }
      }
    } catch {
      // Coba endpoint berikutnya
    }
  }

  return [];
}

/**
 * Mengirim komentar baru ke Supabase atau REST API.
 */
export async function sendLiveComment(payload: {
  userName: string;
  message: string;
  avatarSeed?: string | null;
}): Promise<LiveComment> {
  const supabase = getSupabase();
  if (supabase && isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("live_comments")
        .insert({
          user_name: payload.userName,
          message: payload.message,
          avatar_seed: payload.avatarSeed ?? "listener",
          is_highlighted: false,
          is_hidden: false,
          is_broadcaster: false,
        })
        .select()
        .single();

      if (!error && data) {
        return data as LiveComment;
      }
    } catch {
      // Fallback
    }
  }

  // Coba kirim via Next.js REST API
  const sendUrls = getTargetUrls();

  for (const baseUrl of sendUrls) {
    try {
      const res = await fetch(`${baseUrl}/api/comments`, {
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

  // Kembalikan objek lokal jika offline/demo
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
