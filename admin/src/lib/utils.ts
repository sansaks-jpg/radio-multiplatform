import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const DAY_NAMES = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
] as const;

export const DAY_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"] as const;

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

/**
 * Relative time against a fixed `now` (pass Date.now() at render time from
 * the caller's own memo/effect) — avoids calling Date.now() inside render
 * so hydration stays deterministic.
 */
export function formatRelative(
  iso: string | null | undefined,
  now?: number,
): string {
  if (!iso) return "—";
  const ref = now ?? Date.now();
  const diff = ref - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Baru saja";
  if (mins < 60) return `${mins} mnt lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} jam lalu`;
  const days = Math.floor(hrs / 24);
  return `${days} hari lalu`;
}

export function uid(prefix = "id"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Overlap check for same-day programs (PRD §4.1 B). */
export function hasTimeOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const as = toMin(aStart);
  let ae = toMin(aEnd);
  const bs = toMin(bStart);
  let be = toMin(bEnd);
  // Overnight: treat end as +24h if end <= start
  if (ae <= as) ae += 24 * 60;
  if (be <= bs) be += 24 * 60;
  return as < be && bs < ae;
}
