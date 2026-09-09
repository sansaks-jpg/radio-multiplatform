import { Platform } from "react-native";
import { getSupabase, isSupabaseConfigured } from "./supabase";
import { mockComments } from "../mocks/comments";
import type { LiveComment } from "../types";

export function getAdminApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (Platform.OS === "web") {
    return "http://localhost:3000";
  }
  // USB ADB reverse maps port 3000 to localhost / 127.0.0.1 on Android device
  return "http://127.0.0.1:3000";
}

export const MAX_LIVE_COMMENTS = 50;

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
  const urls = [getAdminApiUrl()];
  if (Platform.OS === "android") {
    urls.push("http://10.0.2.2:3000");
  }

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
  const deltaUrls = [getAdminApiUrl()];
  if (Platform.OS === "android") {
    deltaUrls.push("http://10.0.2.2:3000");
  }

  for (const baseUrl of deltaUrls) {
    try {
      const res = await fetch(`${baseUrl}/api/comments?limit=20`);
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
  const sendUrls = [getAdminApiUrl()];
  if (Platform.OS === "android") {
    sendUrls.push("http://10.0.2.2:3000");
  }

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
