"use client";

/**
 * Client data store with localStorage persistence & automatic Supabase synchronization.
 * Supports offline demo fallback and live two-way synchronization with Supabase.
 */

import { createSeedSnapshot } from "./mock-data";
import type {
  AdminSnapshot,
  Announcer,
  Banner,
  NewsItem,
  NowPlaying,
  Program,
} from "./types";
import { uid } from "./utils";
import { supabase } from "./supabase";
import { fetchWpNews } from "./wordpress";

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

export const DEFAULT_PROGRAM_COVER = "/programs/gaul-morning-show.png";

export function resolveProgramCover(
  programName: string,
  candidateCover: string | null | undefined,
  programsList: Program[] = snapshot.programs,
  announcersList: Announcer[] = snapshot.announcers
): string {
  const norm = (programName || "").trim().toLowerCase();
  if (norm.includes("morning")) {
    return "/programs/gaul-morning-show.png";
  }
  if (norm.includes("setempat") || norm.includes("waktu")) {
    return "/programs/gaul-waktu-setempat.png";
  }
  if (norm.includes("asupan")) {
    return "/programs/asupan-gaul.png";
  }

  // Jika candidateCover adalah foto profil salah satu penyiar atau link prototype lama, abaikan!
  const isAnnouncerPhoto = announcersList.some(
    (a) => a.photo_url && a.photo_url === candidateCover
  );
  if (
    candidateCover &&
    !isAnnouncerPhoto &&
    !candidateCover.includes("WhatsApp-Image")
  ) {
    return candidateCover;
  }

  // Cari program dengan nama yang sama
  const matched = programsList.find(
    (p) => p.name.trim().toLowerCase() === (programName || "").trim().toLowerCase()
  );
  if (matched?.cover_url && !matched.cover_url.includes("WhatsApp-Image")) {
    return matched.cover_url;
  }

  // Jika tidak ditemukan kecocokan nama, cari program yang memiliki cover_url valid
  const anyProgramWithCover = programsList.find(
    (p) => Boolean(p.cover_url) && !p.cover_url?.includes("WhatsApp-Image")
  );
  return anyProgramWithCover?.cover_url || DEFAULT_PROGRAM_COVER;
}

export function normalizeAssetPath(url: string | null | undefined): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (trimmed.includes("/storage/v1/object/public/penyiar/")) {
    const filename = trimmed.split("/storage/v1/object/public/penyiar/")[1]?.split("?")[0];
    return `/penyiar/${filename}`;
  }
  if (trimmed.includes("/storage/v1/object/public/banners/")) {
    const filename = trimmed.split("/storage/v1/object/public/banners/")[1]?.split("?")[0];
    return `/banners/${filename}`;
  }
  if (trimmed.includes("/storage/v1/object/public/programs/")) {
    const filename = trimmed.split("/storage/v1/object/public/programs/")[1]?.split("?")[0];
    return `/programs/${filename}`;
  }
  return trimmed;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseAnnouncerRow(row: any): Announcer {
  let programs: string[] = [];
  let bio = (row.bio as string) || "";

  if (Array.isArray(row.programs)) {
    programs = row.programs;
  } else if (bio && typeof bio === "string" && bio.includes("<!--programs:")) {
    const match = bio.match(/<!--programs:(.*?)-->/);
    if (match && match[1]) {
      try {
        programs = JSON.parse(match[1]);
      } catch {
        programs = match[1].split(",").map((s: string) => s.trim()).filter(Boolean);
      }
      bio = bio.replace(/<!--programs:.*?-->/, "").trim();
    }
  }

  return {
    id: row.id,
    name: row.name,
    nickname: row.nickname || null,
    photo_url: normalizeAssetPath(row.photo_url),
    bio: bio || null,
    instagram: row.instagram || null,
    is_active: typeof row.is_active === "boolean" ? row.is_active : true,
    sort_order: typeof row.sort_order === "number" ? row.sort_order : 0,
    programs,
    created_at: row.created_at,
  };
}

export function formatAnnouncerPayload(ann: Announcer) {
  const programsList = ann.programs && ann.programs.length > 0 ? ann.programs : [];
  const meta = programsList.length > 0 ? ` <!--programs:${JSON.stringify(programsList)}-->` : "";
  const rawBio = (ann.bio || "").replace(/<!--programs:.*?-->/, "").trim();
  const bioWithMeta = rawBio ? `${rawBio}${meta}` : meta.trim();

  return {
    id: ann.id,
    name: ann.name,
    nickname: ann.nickname || null,
    photo_url: ann.photo_url,
    bio: bioWithMeta || null,
    instagram: ann.instagram || null,
    is_active: ann.is_active,
    sort_order: ann.sort_order,
  };
}

async function syncFromSupabase() {
  if (!supabase) return;
  try {
    const [progRes, banRes, npRes, newsRes, profRes, annRes] = await Promise.all([
      supabase
        .from("programs")
        .select("*")
        .order("day_of_week", { ascending: true })
        .order("start_time", { ascending: true }),
      supabase
        .from("banners")
        .select("*")
        .order("sort_order", { ascending: true }),
      supabase.from("now_playing").select("*").eq("id", "current").single(),
      supabase
        .from("news")
        .select("*")
        .order("published_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("announcers")
        .select("*")
        .order("sort_order", { ascending: true }),
    ]);

    let changed = false;
    let nextPrograms = snapshot.programs;
    let nextBanners = snapshot.banners;
    let nextNowPlaying = snapshot.nowPlaying;
    let nextNews = snapshot.news;
    let nextProfiles = snapshot.profiles;
    let nextAnnouncers = snapshot.announcers;

    if (progRes.data && progRes.data.length > 0) {
      nextPrograms = (progRes.data as Program[]).map((p) => ({
        ...p,
        cover_url: normalizeAssetPath(p.cover_url),
      }));
      changed = true;
    }
    if (banRes.data && banRes.data.length > 0) {
      nextBanners = (banRes.data as Banner[]).map((b) => ({
        ...b,
        image_url: normalizeAssetPath(b.image_url),
      }));
      changed = true;
    }
    if (annRes.data && annRes.data.length > 0) {
      nextAnnouncers = annRes.data.map(parseAnnouncerRow);
      changed = true;
    }
    if (npRes.data) {
      const np = npRes.data as NowPlaying;
      nextNowPlaying = {
        ...np,
        current_cover_url: resolveProgramCover(
          np.current_program,
          np.current_cover_url,
          nextPrograms,
          nextAnnouncers
        ),
      };
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
        gender: p.gender ?? null,
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
        announcers: nextAnnouncers,
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
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "announcers" },
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
      const parsedPrograms = parsed.programs ?? createSeedSnapshot().programs;
      const parsedAnnouncers = parsed.announcers ?? createSeedSnapshot().announcers;
      const parsedNowPlaying = parsed.nowPlaying ?? createSeedSnapshot().nowPlaying;
      snapshot = {
        ...createSeedSnapshot(),
        ...parsed,
        programs: parsedPrograms,
        announcers: parsedAnnouncers,
        news: parsed.news ?? createSeedSnapshot().news,
        profiles: parsed.profiles ?? createSeedSnapshot().profiles,
        banners: parsed.banners ?? createSeedSnapshot().banners,
        nowPlaying: {
          ...parsedNowPlaying,
          current_cover_url: resolveProgramCover(
            parsedNowPlaying.current_program,
            parsedNowPlaying.current_cover_url,
            parsedPrograms,
            parsedAnnouncers
          ),
        },
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
  const safeCover = resolveProgramCover(
    patch.current_program,
    patch.current_cover_url,
    snapshot.programs,
    snapshot.announcers
  );

  const nextNowPlaying: NowPlaying = {
    ...snapshot.nowPlaying,
    ...patch,
    current_cover_url: safeCover,
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
        current_cover_url: safeCover,
        updated_at: nextNowPlaying.updated_at,
      })
      .then(({ error }) => {
        if (error) console.error("[data-store] Supabase updateNowPlaying error:", error);
      });
  }

  return nextNowPlaying;
}

/** 1-Klik ganti penyiar on-air atau reset ke kosong (cover program tetap terjaga) */
export function setBroadcasterOnAir(announcer: Announcer | null): NowPlaying {
  const currentProgram = snapshot.nowPlaying.current_program;
  const safeCover = resolveProgramCover(
    currentProgram,
    snapshot.nowPlaying.current_cover_url,
    snapshot.programs,
    snapshot.announcers
  );

  return updateNowPlaying({
    current_program: currentProgram,
    current_host: announcer ? announcer.name : "",
    current_cover_url: safeCover,
  });
}

/* ---------- Announcers (Gaul Squad) ---------- */

export function upsertAnnouncer(
  input: Omit<Announcer, "id"> & { id?: string },
): Announcer {
  const id = input.id ?? uid("ann");
  const next: Announcer = {
    id,
    name: input.name,
    nickname: input.nickname || null,
    photo_url: normalizeAssetPath(input.photo_url),
    bio: input.bio || null,
    instagram: input.instagram || null,
    is_active: typeof input.is_active === "boolean" ? input.is_active : true,
    sort_order:
      typeof input.sort_order === "number"
        ? input.sort_order
        : snapshot.announcers.length + 1,
    programs: input.programs ?? [],
    created_at: input.created_at ?? new Date().toISOString(),
  };

  const idx = snapshot.announcers.findIndex((a) => a.id === id);
  const announcers =
    idx >= 0
      ? snapshot.announcers.map((a, i) => (i === idx ? next : a))
      : [...snapshot.announcers, next];

  snapshot = { ...snapshot, announcers };
  emit();

  if (supabase) {
    const payload = formatAnnouncerPayload(next);
    // Coba simpan dengan field programs native jika kolom sudah ada di Supabase
    supabase
      .from("announcers")
      .upsert({
        ...payload,
        programs: next.programs || [],
      })
      .then(({ error }) => {
        if (error) {
          // Fallback tanpa kolom native programs (tersimpan aman di bio metadata)
          supabase!
            .from("announcers")
            .upsert(payload)
            .then(({ error: fallbackErr }) => {
              if (fallbackErr) {
                console.error("[data-store] Supabase upsertAnnouncer error:", fallbackErr);
              }
            });
        }
      });
  }

  return next;
}

export function deleteAnnouncer(id: string) {
  snapshot = {
    ...snapshot,
    announcers: snapshot.announcers.filter((a) => a.id !== id),
  };
  emit();

  if (supabase) {
    supabase
      .from("announcers")
      .delete()
      .eq("id", id)
      .then(({ error }) => {
        if (error) console.error("[data-store] Supabase deleteAnnouncer error:", error);
      });
  }
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
    cover_url: normalizeAssetPath(input.cover_url) || null,
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

/** Simpan atau perbarui banyak program sekaligus dalam 1 batch operasi */
export function upsertProgramsBatch(
  inputs: (Omit<Program, "id"> & { id?: string })[],
): Program[] {
  if (!inputs || inputs.length === 0) return [];

  const createdOrUpdated: Program[] = inputs.map((input) => ({
    id: input.id ?? uid("prog"),
    name: input.name,
    host: input.host,
    day_of_week: input.day_of_week,
    start_time: input.start_time,
    end_time: input.end_time,
    cover_url: input.cover_url || null,
    description: input.description || "",
  }));

  const map = new Map<string, Program>(snapshot.programs.map((p) => [p.id, p]));
  createdOrUpdated.forEach((item) => {
    map.set(item.id, item);
  });

  snapshot = {
    ...snapshot,
    programs: Array.from(map.values()),
  };
  emit();

  if (supabase) {
    supabase
      .from("programs")
      .upsert(createdOrUpdated)
      .then(({ error }) => {
        if (error) console.error("[data-store] Supabase upsertProgramsBatch error:", error);
      });
  }

  return createdOrUpdated;
}

/** Hapus banyak program sekaligus berdasarkan daftar id */
export function deleteProgramsBatch(ids: string[]) {
  if (!ids || ids.length === 0) return;
  const idSet = new Set(ids);
  snapshot = {
    ...snapshot,
    programs: snapshot.programs.filter((p) => !idSet.has(p.id)),
  };
  emit();

  if (supabase) {
    supabase
      .from("programs")
      .delete()
      .in("id", ids)
      .then(({ error }) => {
        if (error) console.error("[data-store] Supabase deleteProgramsBatch error:", error);
      });
  }
}

/** Salin semua slot jadwal dari sourceDay ke satu atau beberapa targetDays */
export function copyDaySchedule(
  sourceDay: number,
  targetDays: number[],
  overwrite = false,
): { addedCount: number; replacedCount: number } {
  const sourcePrograms = snapshot.programs.filter(
    (p) => p.day_of_week === sourceDay,
  );
  if (sourcePrograms.length === 0 || targetDays.length === 0) {
    return { addedCount: 0, replacedCount: 0 };
  }

  const targetSet = new Set(targetDays);
  let idsToDelete: string[] = [];
  if (overwrite) {
    idsToDelete = snapshot.programs
      .filter((p) => targetSet.has(p.day_of_week))
      .map((p) => p.id);
  }

  const newPrograms: Program[] = [];
  for (const targetDay of targetDays) {
    for (const sp of sourcePrograms) {
      newPrograms.push({
        id: uid("prog"),
        name: sp.name,
        host: sp.host,
        day_of_week: targetDay,
        start_time: sp.start_time,
        end_time: sp.end_time,
        cover_url: sp.cover_url,
        description: sp.description,
      });
    }
  }

  // Update snapshot lokal
  let filtered = snapshot.programs;
  if (overwrite && idsToDelete.length > 0) {
    const delSet = new Set(idsToDelete);
    filtered = filtered.filter((p) => !delSet.has(p.id));
  }
  snapshot = {
    ...snapshot,
    programs: [...filtered, ...newPrograms],
  };
  emit();

  // Sinkronisasi Supabase
  if (supabase) {
    const client = supabase;
    const doSync = async () => {
      try {
        if (overwrite && idsToDelete.length > 0) {
          await client.from("programs").delete().in("id", idsToDelete);
        }
        if (newPrograms.length > 0) {
          await client.from("programs").upsert(newPrograms);
        }
      } catch (err) {
        console.error("[data-store] Supabase copyDaySchedule error:", err);
      }
    };
    void doSync();
  }

  return { addedCount: newPrograms.length, replacedCount: idsToDelete.length };
}

/* ---------- News ---------- */

export function setNewsItems(items: NewsItem[], syncTime?: string) {
  const stamp = syncTime || new Date().toISOString();
  snapshot = {
    ...snapshot,
    news: items,
    lastNewsSyncAt: stamp,
  };
  emit();
}

export async function syncNewsFromWordPress(): Promise<{
  added: number;
  news: NewsItem[];
}> {
  const stamp = new Date().toISOString();
  let itemsToInsert: NewsItem[] = [];

  try {
    const res = await fetchWpNews({ page: 1, perPage: 20 });
    itemsToInsert = res.items;
  } catch (err) {
    console.error("[data-store] Error syncing news from WordPress:", err);
  }

  if (itemsToInsert.length > 0) {
    if (supabase) {
      const payload = itemsToInsert.map((item) => ({
        id: item.id,
        wp_post_id: item.wp_post_id,
        title: item.title,
        content: item.content,
        image_url: item.image_url,
        category: item.category,
        published_at: item.published_at,
        synced_at: stamp,
      }));

      supabase
        .from("news")
        .upsert(payload, { onConflict: "wp_post_id" })
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
      .slice(0, 50);

    snapshot = {
      ...snapshot,
      news: merged,
      lastNewsSyncAt: stamp,
    };
    emit();

    return { added: itemsToInsert.length, news: merged };
  }

  return { added: 0, news: snapshot.news };
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

/* ---------- Banners ---------- */

export function upsertBanner(
  input: Omit<Banner, "id"> & { id?: string },
): Banner {
  const id = input.id ?? uid("ban");
  const next: Banner = {
    ...input,
    id,
    image_url: normalizeAssetPath(input.image_url),
  };
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

