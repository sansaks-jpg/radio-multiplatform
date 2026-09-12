import { createSeedSnapshot } from "./mock-data";
import { supabase, isSupabaseConfigured } from "./supabase";
import type { Announcer, Banner, NowPlaying, Program } from "./types";

/**
 * Server-side Radio Cache and Bus for Next.js.
 * Provides fast in-memory access (<5ms) to radio metadata without bombarding Supabase,
 * protecting free-tier limits and providing resilience across hosting environments.
 */

interface ServerRadioStore {
  nowPlaying: NowPlaying;
  programs: Program[];
  announcers: Announcer[];
  banners: Banner[];
  lastSynced: {
    nowPlaying: number;
    programs: number;
    announcers: number;
    banners: number;
  };
}

declare global {
  var __gaulfm_server_radio_store: ServerRadioStore | undefined;
}

function initStore(): ServerRadioStore {
  const seed = createSeedSnapshot();
  return {
    nowPlaying: seed.nowPlaying,
    programs: seed.programs,
    announcers: seed.announcers,
    banners: seed.banners,
    lastSynced: {
      nowPlaying: 0,
      programs: 0,
      announcers: 0,
      banners: 0,
    },
  };
}

const store: ServerRadioStore = global.__gaulfm_server_radio_store ?? initStore();
if (!global.__gaulfm_server_radio_store) {
  global.__gaulfm_server_radio_store = store;
}

// TTL in milliseconds
const TTL_NOW_PLAYING_MS = 15_000;
const TTL_PROGRAMS_MS = 60_000;
const TTL_ANNOUNCERS_MS = 120_000;
const TTL_BANNERS_MS = 120_000;

// --- WIB TIME & SCHEDULE UTILITIES ---

export function getWibParts(date: Date = new Date()) {
  const wibTime = new Date(date.getTime() + 7 * 3600 * 1000);
  return {
    day: wibTime.getUTCDay(), // 0 = Sunday ... 6 = Saturday
    date: wibTime.getUTCDate(),
    month: wibTime.getUTCMonth(),
    year: wibTime.getUTCFullYear(),
    hours: wibTime.getUTCHours(),
    minutes: wibTime.getUTCMinutes(),
    seconds: wibTime.getUTCSeconds(),
    totalMinutes: wibTime.getUTCHours() * 60 + wibTime.getUTCMinutes(),
  };
}

export function toMinutes(hhmm: string): number {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(":").map((part) => parseInt(part, 10));
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

/**
 * Mengonversi jam HH:mm WIB hari ini menjadi Date UTC standar.
 */
export function createWibDateToday(hhmm: string, now: Date = new Date()): Date {
  const { year, month, date } = getWibParts(now);
  const [hStr, mStr] = hhmm.split(":");
  const h = parseInt(hStr || "0", 10);
  const m = parseInt(mStr || "0", 10);

  // UTC time = WIB hour - 7 hours
  return new Date(Date.UTC(year, month, date, h - 7, m, 0, 0));
}

export interface ActiveCommentSession {
  /** Waktu batas awal komentar untuk program yang aktif/terakhir tayang. Null jika hari ini tidak ada program. */
  sessionStart: Date | null;
  /** ISO string untuk serialization */
  sessionStartIso: string | null;
  /** Nama program siaran terkait */
  programName: string | null;
  /** Jam mulai siaran (HH:mm) */
  startTime: string | null;
  /** Jam selesai siaran (HH:mm) */
  endTime: string | null;
  /** Waktu mulai program berikutnya hari ini (jika ada) */
  nextProgramStart: Date | null;
  nextProgramName: string | null;
  /** True jika saat ini sedang jam on-air program aktif */
  isOnAir: boolean;
}

/**
 * Menghitung sesi komentar aktif berdasarkan jadwal siaran hari ini (WIB).
 * 
 * Aturan Bisnis:
 * 1. Komentar untuk Program A aktif dari jam mulai (misal 08:00) dan TETAP ADA
 *    sampai akhir program hingga detik sebelum program berikutnya dimulai (misal 13:59).
 * 2. Tepat saat program berikutnya (Program B jam 14:00) dimulai, sessionStart
 *    berpindah ke 14:00, sehingga komentar sebelum jam 14:00 dianggap kedaluwarsa.
 * 3. Jika di hari tersebut tidak ada program sama sekali, sessionStart = null (komentar tidak dihapus).
 */
export function getActiveCommentSession(
  programsList: Program[] = store.programs,
  now: Date = new Date()
): ActiveCommentSession {
  const { day, totalMinutes } = getWibParts(now);

  // Filter program untuk hari ini
  const todayPrograms = programsList
    .filter((p) => p.day_of_week === day)
    .sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time));

  // Jika hari ini tidak ada program sama sekali: komentar tidak dihapus!
  if (todayPrograms.length === 0) {
    return {
      sessionStart: null,
      sessionStartIso: null,
      programName: null,
      startTime: null,
      endTime: null,
      nextProgramStart: null,
      nextProgramName: null,
      isOnAir: false,
    };
  }

  // Program yang sudah dimulai hari ini
  const startedPrograms = todayPrograms.filter(
    (p) => toMinutes(p.start_time) <= totalMinutes
  );

  // Program mendatang hari ini
  const upcomingPrograms = todayPrograms.filter(
    (p) => toMinutes(p.start_time) > totalMinutes
  );

  const nextSlot = upcomingPrograms.length > 0 ? upcomingPrograms[0] : null;
  const nextProgramStart = nextSlot
    ? createWibDateToday(nextSlot.start_time, now)
    : null;
  const nextProgramName = nextSlot ? nextSlot.name : null;

  if (startedPrograms.length === 0) {
    // Belum ada program yang mulai hari ini (sebelum program pertama)
    // Sesi awal belum berganti hari ini, komentar tetap aman sampai program pertama mulai.
    return {
      sessionStart: null,
      sessionStartIso: null,
      programName: null,
      startTime: null,
      endTime: null,
      nextProgramStart,
      nextProgramName,
      isOnAir: false,
    };
  }

  // Program terakhir yang sudah dimulai hari ini
  const currentSlot = startedPrograms[startedPrograms.length - 1];
  const sessionStart = createWibDateToday(currentSlot.start_time, now);
  const startMin = toMinutes(currentSlot.start_time);
  const endMin = toMinutes(currentSlot.end_time);
  const isOnAir = totalMinutes >= startMin && totalMinutes < endMin;

  return {
    sessionStart,
    sessionStartIso: sessionStart.toISOString(),
    programName: currentSlot.name,
    startTime: currentSlot.start_time,
    endTime: currentSlot.end_time,
    nextProgramStart,
    nextProgramName,
    isOnAir,
  };
}

// --- DATA ACCESSORS & SYNC WITH SUPABASE ---

export async function getServerNowPlaying(): Promise<NowPlaying> {
  const now = Date.now();
  if (now - store.lastSynced.nowPlaying < TTL_NOW_PLAYING_MS) {
    return store.nowPlaying;
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("now_playing")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        store.nowPlaying = {
          id: data.id,
          current_program: data.current_program ?? store.nowPlaying.current_program,
          current_host: data.current_host ?? store.nowPlaying.current_host,
          current_cover_url: data.current_cover_url ?? store.nowPlaying.current_cover_url,
          updated_at: data.updated_at ?? new Date().toISOString(),
        };
        store.lastSynced.nowPlaying = now;
      }
    } catch {
      // Fallback to memory store
    }
  }

  return store.nowPlaying;
}

export async function getServerPrograms(): Promise<Program[]> {
  const now = Date.now();
  if (now - store.lastSynced.programs < TTL_PROGRAMS_MS) {
    return store.programs;
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("programs")
        .select("*")
        .order("day_of_week", { ascending: true })
        .order("start_time", { ascending: true });

      if (!error && data && data.length > 0) {
        store.programs = data as Program[];
        store.lastSynced.programs = now;
      }
    } catch {
      // Fallback
    }
  }

  return store.programs;
}

export async function getServerAnnouncers(): Promise<Announcer[]> {
  const now = Date.now();
  if (now - store.lastSynced.announcers < TTL_ANNOUNCERS_MS) {
    return store.announcers;
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("announcers")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (!error && data && data.length > 0) {
        store.announcers = data as Announcer[];
        store.lastSynced.announcers = now;
      }
    } catch {
      // Fallback
    }
  }

  return store.announcers;
}

export async function getServerBanners(): Promise<Banner[]> {
  const now = Date.now();
  if (now - store.lastSynced.banners < TTL_BANNERS_MS) {
    return store.banners;
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("banners")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (!error && data && data.length > 0) {
        store.banners = data as Banner[];
        store.lastSynced.banners = now;
      }
    } catch {
      // Fallback
    }
  }

  return store.banners;
}

/**
 * Mendapatkan ringkasan seluruh state siaran dalam satu call efisien.
 */
export async function getServerLiveState() {
  const [nowPlaying, programs, announcers, banners] = await Promise.all([
    getServerNowPlaying(),
    getServerPrograms(),
    getServerAnnouncers(),
    getServerBanners(),
  ]);

  const commentSession = getActiveCommentSession(programs);

  return {
    nowPlaying,
    programsCount: programs.length,
    announcers,
    banners,
    commentSession,
    serverTimestamp: new Date().toISOString(),
  };
}

/**
 * Memperbarui memory cache server saat ada mutasi dari panel admin
 */
export function setServerNowPlaying(data: Partial<NowPlaying>) {
  store.nowPlaying = { ...store.nowPlaying, ...data, updated_at: new Date().toISOString() };
  store.lastSynced.nowPlaying = Date.now();
}

export function setServerPrograms(programs: Program[]) {
  store.programs = programs;
  store.lastSynced.programs = Date.now();
}
