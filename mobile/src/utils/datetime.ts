import type { Program } from "../types";

/** Indonesian day labels, indexed by Date.getDay() (0 = Sunday). */
export const DAY_FULL_ID = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
] as const;

export const DAY_SHORT_ID = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"] as const;

const MONTH_SHORT_ID = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
] as const;

export function getWibParts(date: Date = new Date()) {
  const wibTime = new Date(date.getTime() + 7 * 3600 * 1000);
  return {
    day: wibTime.getUTCDay(),
    date: wibTime.getUTCDate(),
    month: wibTime.getUTCMonth(),
    year: wibTime.getUTCFullYear(),
    hours: wibTime.getUTCHours(),
    minutes: wibTime.getUTCMinutes(),
    seconds: wibTime.getUTCSeconds(),
    totalMinutes: wibTime.getUTCHours() * 60 + wibTime.getUTCMinutes(),
  };
}

export function todayDow(now: Date = new Date()): number {
  return getWibParts(now).day;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((part) => parseInt(part, 10));
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

/**
 * True when `program` is on air right now in WIB timezone.
 * Handles overnight shows (end_time earlier than start_time).
 */
export function isOnAirNow(
  program: Pick<Program, "day_of_week" | "start_time" | "end_time">,
  now: Date = new Date(),
): boolean {
  const start = toMinutes(program.start_time);
  const end = toMinutes(program.end_time);
  const { day, totalMinutes } = getWibParts(now);

  if (end > start) {
    return program.day_of_week === day && totalMinutes >= start && totalMinutes < end;
  }
  // Overnight show: starts on program.day_of_week at `start`, ends on (day_of_week + 1) % 7 at `end`.
  const startsToday = program.day_of_week === day && totalMinutes >= start;
  const endedToday = (program.day_of_week + 1) % 7 === day && totalMinutes < end;
  return startsToday || endedToday;
}

export type PartOfDay = "pagi" | "siang" | "sore" | "malam";

/** Bagian hari dari jam WIB (0-23) — dipakai untuk greeting & pengelompokan jadwal. */
export function partOfDay(hour: number): PartOfDay {
  if (hour >= 4 && hour < 11) return "pagi";
  if (hour >= 11 && hour < 15) return "siang";
  if (hour >= 15 && hour < 19) return "sore";
  return "malam";
}

export const PART_OF_DAY_LABEL: Record<PartOfDay, string> = {
  pagi: "Pagi",
  siang: "Siang",
  sore: "Sore",
  malam: "Malam",
};

/**
 * Progress siaran program yang sedang mengudara.
 * Return null jika program tidak sedang on air sekarang.
 */
export function getProgramProgress(
  program: Pick<Program, "day_of_week" | "start_time" | "end_time">,
  now: Date = new Date(),
): { elapsedPct: number; remainingMinutes: number } | null {
  if (!isOnAirNow(program, now)) return null;
  const start = toMinutes(program.start_time);
  const end = toMinutes(program.end_time);
  const { totalMinutes } = getWibParts(now);

  const total = end > start ? end - start : 24 * 60 - start + end;
  const elapsed =
    end > start
      ? totalMinutes - start
      : totalMinutes >= start
        ? totalMinutes - start
        : 24 * 60 - start + totalMinutes;

  const clamped = Math.max(0, Math.min(total, elapsed));
  return {
    elapsedPct: total > 0 ? clamped / total : 0,
    remainingMinutes: Math.max(0, total - clamped),
  };
}

/** "125" → "2 jam 5 menit"; "40" → "40 menit". */
export function formatDurationMinutes(totalMinutes: number): string {
  const mins = Math.max(0, Math.round(totalMinutes));
  if (mins < 1) return "< 1 menit";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} menit`;
  return m > 0 ? `${h} jam ${m} menit` : `${h} jam`;
}

export function getMinutesToProgram(
  program: Pick<Program, "day_of_week" | "start_time" | "end_time">,
  now: Date = new Date(),
): number {
  const start = toMinutes(program.start_time);
  const { day, totalMinutes } = getWibParts(now);

  if (program.day_of_week === day && start > totalMinutes) {
    return start - totalMinutes;
  }

  let targetDay = program.day_of_week;
  let daysAhead = (targetDay + 7 - day) % 7;
  if (daysAhead === 0 && totalMinutes >= start) {
    daysAhead = 7;
  }

  return daysAhead * 24 * 60 + start - totalMinutes;
}

/** "2026-07-12T08:00:00Z" → "12 Jul 2026" (in WIB) */
export function formatDateID(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const parts = getWibParts(d);
  return `${parts.date} ${MONTH_SHORT_ID[parts.month]} ${parts.year}`;
}

/** Menghitung selisih waktu relatif dari waktu sekarang dalam format Bahasa Indonesia */
export function formatDistanceToNow(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);

  if (diffSecs < 10 || diffMs < 0) return "Baru saja";
  if (diffSecs < 60) return `${diffSecs} dtk lalu`;
  if (diffMins < 60) return `${diffMins} mnt lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  return formatDateID(iso);
}
