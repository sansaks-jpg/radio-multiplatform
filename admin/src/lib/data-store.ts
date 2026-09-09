"use client";

/**
 * Client data store with localStorage persistence.
 * Demo-first: works fully offline. When Supabase env is set, methods can
 * be swapped to real queries without changing UI components.
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

const STORAGE_KEY = "gaulfm-admin-v1";

type Listener = () => void;

let snapshot: AdminSnapshot = createSeedSnapshot();
let hydrated = false;
const listeners = new Set<Listener>();

/**
 * Cached server snapshot — must be referentially stable across calls.
 * React calls getServerSnapshot repeatedly during SSR; returning a fresh
 * object each time triggers the "getServerSnapshot should be cached" warning.
 */
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
}

export function subscribe(listener: Listener) {
  hydrate();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Client snapshot — hydrates from localStorage. May differ from server.
 * Used as `getSnapshot` in useSyncExternalStore.
 */
export function getSnapshot(): AdminSnapshot {
  hydrate();
  return snapshot;
}

/**
 * Server snapshot — always the seed. Keeps SSR/CSR first render identical
 * so hydration never mismatches (React then re-renders with client data).
 * Used as `getServerSnapshot` in useSyncExternalStore.
 */
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
  snapshot = {
    ...snapshot,
    nowPlaying: {
      ...snapshot.nowPlaying,
      ...patch,
      updated_at: new Date().toISOString(),
    },
  };
  emit();
  return snapshot.nowPlaying;
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
    cover_url: input.cover_url,
    description: input.description,
  };
  const idx = snapshot.programs.findIndex((p) => p.id === id);
  const programs =
    idx >= 0
      ? snapshot.programs.map((p, i) => (i === idx ? next : p))
      : [...snapshot.programs, next];
  snapshot = { ...snapshot, programs };
  emit();
  return next;
}

export function deleteProgram(id: string) {
  snapshot = {
    ...snapshot,
    programs: snapshot.programs.filter((p) => p.id !== id),
  };
  emit();
}

/* ---------- News ---------- */

export function syncNewsFromWordPress(): {
  added: number;
  news: NewsItem[];
} {
  // Simulated WP pull — prepends a fresh demo item + bumps sync time
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
  return next;
}

export function deleteBanner(id: string) {
  snapshot = {
    ...snapshot,
    banners: snapshot.banners.filter((b) => b.id !== id),
  };
  emit();
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

