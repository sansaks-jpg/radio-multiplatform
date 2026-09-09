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
    const [progRes, banRes, npRes] = await Promise.all([
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
    ]);

    let changed = false;
    let nextPrograms = snapshot.programs;
    let nextBanners = snapshot.banners;
    let nextNowPlaying = snapshot.nowPlaying;

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

    if (changed) {
      snapshot = {
        ...snapshot,
        programs: nextPrograms,
        banners: nextBanners,
        nowPlaying: nextNowPlaying,
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

export function syncNewsFromWordPress(): {
  added: number;
  news: NewsItem[];
} {
  const stamp = new Date().toISOString();
  const fresh: NewsItem = {
    id: uid("n"),
    wp_post_id: 200 + Math.floor(Math.random() * 800),
    title: `Update WordPress · ${new Date().toLocaleTimeString("id-ID")}`,
    content: "<p>Artikel baru tersinkron dari radiogaulfmsmg.com (demo).</p>",
    image_url: `https://picsum.photos/seed/wp-${Date.now()}/800/450`,
    category: "Station",
    published_at: stamp,
    synced_at: stamp,
  };
  const news = [fresh, ...snapshot.news].slice(0, 40);
  snapshot = {
    ...snapshot,
    news,
    lastNewsSyncAt: stamp,
  };
  emit();
  return { added: 1, news };
}

export function deleteNews(id: string) {
  snapshot = {
    ...snapshot,
    news: snapshot.news.filter((n) => n.id !== id),
  };
  emit();
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
