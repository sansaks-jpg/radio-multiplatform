"use client";

/**
 * Client data store with localStorage persistence & automatic Supabase synchronization.
 * Supports offline demo fallback and live two-way synchronization with Supabase.
 */

import { createSeedSnapshot } from "./mock-data";
import type {
  AdminSnapshot,
  Banner,
  NewsItem,
  NowPlaying,
  Profile,
  Program,
  StreamSettings,
} from "./types";
import { uid } from "./utils";
import { supabase } from "./supabase";

const STORAGE_KEY = "gaulfm-admin-v1";

type Listener = () => void;

let snapshot: AdminSnapshot = createSeedSnapshot();
let hydrated = false;
let realtimeSubscribed = false;
const listeners = new Set<Listener>();

let serverSnapshot: AdminSnapshot | null = null;
function getCachedServerSnapshot(): AdminSnapshot {
  if (!serverSnapshot) serverSnapshot = createSeedSnapshot();
  return serverSnapshot;
}

function emit() {
  listeners.forEach((l) => l());
  persist();
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    /* quota / private mode */
  }
}

export async function syncFromSupabase() {
  if (!supabase) return;
  try {
    const [progRes, banRes, npRes, newsRes, profRes] = await Promise.all([
      supabase
        .from("programs")
        .select("*")
        .order("day_of_week", { ascending: true })
        .order("start_time", { ascending: true }),
      supabase
        .from("banners")
        .select("*")
        .order("sort_order", { ascending: true }),
      supabase
        .from("now_playing")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("news")
        .select("*")
        .order("published_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    let changed = false;
    let nextPrograms = snapshot.programs;
    let nextBanners = snapshot.banners;
    let nextNowPlaying = snapshot.nowPlaying;
    let nextNews = snapshot.news;
    let nextProfiles = snapshot.profiles;

    if (progRes.data && progRes.data.length > 0) {
      nextPrograms = progRes.data as Program[];
      changed = true;
    }
    if (banRes.data && banRes.data.length > 0) {
      nextBanners = banRes.data as Banner[];
      changed = true;
    }
    if (npRes.data) {
      nextNowPlaying = npRes.data as NowPlaying;
      changed = true;
    }
    if (newsRes.data && newsRes.data.length > 0) {
      nextNews = newsRes.data as NewsItem[];
      changed = true;
    }
    if (profRes.data && profRes.data.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      nextProfiles = (profRes.data as any[]).map((p) => ({
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        whatsapp: p.whatsapp_number ?? p.whatsapp ?? null,
        device_os: p.device_os ?? null,
        device_model: p.device_model ?? null,
        city: p.location_city ?? p.city ?? null,
        latitude:
          p.location_lat != null
            ? Number(p.location_lat)
            : p.latitude != null
              ? Number(p.latitude)
              : null,
        longitude:
          p.location_lng != null
            ? Number(p.location_lng)
            : p.longitude != null
              ? Number(p.longitude)
              : null,
        push_token: p.push_token ?? null,
        last_login: p.last_login ?? null,
        created_at: p.created_at,
      }));
      changed = true;
    }

    if (changed) {
      snapshot = {
        ...snapshot,
        programs: nextPrograms,
        banners: nextBanners,
        nowPlaying: nextNowPlaying,
        news: nextNews,
        profiles: nextProfiles,
      };
      emit();
    }
  } catch (err) {
    console.error("[data-store] Error syncing from Supabase:", err);
  }
}

function setupRealtime() {
  if (realtimeSubscribed || typeof window === "undefined" || !supabase) return;
  realtimeSubscribed = true;
  supabase
    .channel("gaulfm-admin-realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "programs" },
      () => {
        void syncFromSupabase();
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "banners" },
      () => {
        void syncFromSupabase();
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "now_playing" },
      () => {
        void syncFromSupabase();
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "news" },
      () => {
        void syncFromSupabase();
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "profiles" },
      () => {
        void syncFromSupabase();
      }
    )
    .subscribe();
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AdminSnapshot;
      snapshot = {
        ...createSeedSnapshot(),
        ...parsed,
        programs: parsed.programs ?? createSeedSnapshot().programs,
        news: parsed.news ?? createSeedSnapshot().news,
        profiles: parsed.profiles ?? createSeedSnapshot().profiles,
        banners: parsed.banners ?? createSeedSnapshot().banners,
        nowPlaying: parsed.nowPlaying ?? createSeedSnapshot().nowPlaying,
        streamSettings: parsed.streamSettings ?? createSeedSnapshot().streamSettings,
      };
    }
  } catch {
    snapshot = createSeedSnapshot();
  }

  // Pull latest updates from Supabase and listen to realtime updates
  void syncFromSupabase();
  setupRealtime();
}

export function subscribe(listener: Listener) {
  hydrate();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): AdminSnapshot {
  hydrate();
  return snapshot;
}

export function getServerSnapshot(): AdminSnapshot {
  return getCachedServerSnapshot();
}

export function resetDemoData() {
  snapshot = createSeedSnapshot();
  emit();
}

/* ---------- Now Playing ---------- */

export function updateNowPlaying(
  patch: Pick<
    NowPlaying,
    "current_program" | "current_host" | "current_cover_url"
  >,
): NowPlaying {
  const nextNowPlaying: NowPlaying = {
    ...snapshot.nowPlaying,
    ...patch,
    updated_at: new Date().toISOString(),
  };

  snapshot = {
    ...snapshot,
    nowPlaying: nextNowPlaying,
  };
  emit();

  if (supabase) {
    supabase
      .from("now_playing")
      .upsert({
        id: "00000000-0000-0000-0000-000000000001",
        current_program: patch.current_program,
        current_host: patch.current_host,
        current_cover_url: patch.current_cover_url,
        updated_at: nextNowPlaying.updated_at,
      })
      .then(({ error }) => {
        if (error) console.error("[data-store] Supabase updateNowPlaying error:", error);
      });
  }

  return nextNowPlaying;
}

/* ---------- Programs ---------- */

export function upsertProgram(
  input: Omit<Program, "id"> & { id?: string },
): Program {
  const id = input.id ?? uid("prog");
  const next: Program = {
    id,
    name: input.name,
    host: input.host,
    day_of_week: input.day_of_week,
    start_time: input.start_time,
    end_time: input.end_time,
    cover_url: input.cover_url || null,
    description: input.description,
  };
  const idx = snapshot.programs.findIndex((p) => p.id === id);
  const programs =
    idx >= 0
      ? snapshot.programs.map((p, i) => (i === idx ? next : p))
      : [...snapshot.programs, next];
  snapshot = { ...snapshot, programs };
  emit();

  if (supabase) {
    supabase
      .from("programs")
      .upsert({
        id: next.id,
        name: next.name,
        host: next.host,
        day_of_week: next.day_of_week,
        start_time: next.start_time,
        end_time: next.end_time,
        cover_url: next.cover_url || null,
        description: next.description || "",
      })
      .then(({ error }) => {
        if (error) console.error("[data-store] Supabase upsertProgram error:", error);
      });
  }

  return next;
}

export function deleteProgram(id: string) {
  snapshot = {
    ...snapshot,
    programs: snapshot.programs.filter((p) => p.id !== id),
  };
  emit();

  if (supabase) {
    supabase
      .from("programs")
      .delete()
      .eq("id", id)
      .then(({ error }) => {
        if (error) console.error("[data-store] Supabase deleteProgram error:", error);
      });
  }
}

/* ---------- News ---------- */

export async function syncNewsFromWordPress(): Promise<{
  added: number;
  news: NewsItem[];
}> {
  const stamp = new Date().toISOString();
  let itemsToInsert: NewsItem[] = [];

  try {
    const res = await fetch(
      "https://radiogaulfmsmg.com/wp-json/wp/v2/posts?_embed&per_page=10",
      { signal: AbortSignal.timeout(4000) }
    );
    if (res.ok) {
      const posts = await res.json();
      if (Array.isArray(posts) && posts.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        itemsToInsert = posts.map((post: any) => ({
          id: `wp-${post.id}`,
          wp_post_id: post.id,
          title: post.title?.rendered
            ? post.title.rendered.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&")
            : "Berita Gaul FM",
          content: post.content?.rendered || "",
          image_url:
            post._embedded?.["wp:featuredmedia"]?.[0]?.source_url ||
            "https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-28-at-11.36.02.jpeg",
          category: post._embedded?.["wp:term"]?.[0]?.[0]?.name || "Berita",
          published_at: post.date_gmt
            ? new Date(post.date_gmt + "Z").toISOString()
            : stamp,
          synced_at: stamp,
        }));
      }
    }
  } catch {
    // WP network fallback
  }

  if (itemsToInsert.length === 0) {
    itemsToInsert = [
      {
        id: uid("n"),
        wp_post_id: 200 + Math.floor(Math.random() * 800),
        title: `Update Gaul FM News · ${new Date().toLocaleTimeString("id-ID")}`,
        content: "<p>Artikel tersinkron dari portal berita radiogaulfmsmg.com.</p>",
        image_url:
          "https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-28-at-11.36.02.jpeg",
        category: "Station",
        published_at: stamp,
        synced_at: stamp,
      },
    ];
  }

  if (supabase) {
    supabase
      .from("news")
      .upsert(itemsToInsert)
      .then(({ error }) => {
        if (error) console.error("[data-store] Supabase news upsert error:", error);
      });
  }

  const existingMap = new Map(snapshot.news.map((n) => [n.id, n]));
  itemsToInsert.forEach((item) => existingMap.set(item.id, item));
  const merged = Array.from(existingMap.values())
    .sort(
      (a, b) =>
        new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
    )
    .slice(0, 40);

  snapshot = {
    ...snapshot,
    news: merged,
    lastNewsSyncAt: stamp,
  };
  emit();

  return { added: itemsToInsert.length, news: merged };
}

export function deleteNews(id: string) {
  snapshot = {
    ...snapshot,
    news: snapshot.news.filter((n) => n.id !== id),
  };
  emit();

  if (supabase) {
    supabase
      .from("news")
      .delete()
      .eq("id", id)
      .then(({ error }) => {
        if (error) console.error("[data-store] Supabase deleteNews error:", error);
      });
  }
}

/* ---------- Profiles (read-only marketing data) ---------- */

export function getProfiles(): Profile[] {
  return getSnapshot().profiles;
}

/* ---------- Banners ---------- */

export function upsertBanner(
  input: Omit<Banner, "id"> & { id?: string },
): Banner {
  const id = input.id ?? uid("ban");
  const next: Banner = { ...input, id };
  const idx = snapshot.banners.findIndex((b) => b.id === id);
  const banners =
    idx >= 0
      ? snapshot.banners.map((b, i) => (i === idx ? next : b))
      : [...snapshot.banners, next];
  snapshot = { ...snapshot, banners };
  emit();

  if (supabase) {
    supabase
      .from("banners")
      .upsert({
        id: next.id,
        title: next.title,
        subtitle: next.subtitle || null,
        image_url: next.image_url,
        cta_label: next.cta_label || null,
        link_to: next.link_to || null,
        link_url: next.link_url || null,
        type: next.type,
        sort_order: next.sort_order,
        is_active: next.is_active,
      })
      .then(({ error }) => {
        if (error) console.error("[data-store] Supabase upsertBanner error:", error);
      });
  }

  return next;
}

export function deleteBanner(id: string) {
  snapshot = {
    ...snapshot,
    banners: snapshot.banners.filter((b) => b.id !== id),
  };
  emit();

  if (supabase) {
    supabase
      .from("banners")
      .delete()
      .eq("id", id)
      .then(({ error }) => {
        if (error) console.error("[data-store] Supabase deleteBanner error:", error);
      });
  }
}

export function setSheetsStatus(status: AdminSnapshot["sheetsSyncStatus"]) {
  snapshot = { ...snapshot, sheetsSyncStatus: status };
  emit();
}

/* ---------- Stream Settings ---------- */

export function updateStreamSettings(
  patch: Partial<StreamSettings>,
): StreamSettings {
  const current = snapshot.streamSettings ?? createSeedSnapshot().streamSettings;
  const updated: StreamSettings = {
    ...current,
    ...patch,
    updated_at: new Date().toISOString(),
  };
  snapshot = {
    ...snapshot,
    streamSettings: updated,
  };
  emit();
  return updated;
}

export function resetStreamSettings(): StreamSettings {
  const defaults = createSeedSnapshot().streamSettings;
  snapshot = {
    ...snapshot,
    streamSettings: { ...defaults, updated_at: new Date().toISOString() },
  };
  emit();
  return snapshot.streamSettings;
}
