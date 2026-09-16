import type { Announcer } from "../types";

export function getProgramAnnouncers(announcers: Announcer[], programName: string) {
  const normalized = programName.trim().toLowerCase();
  const matched = normalized ? announcers.filter((announcer) => announcer.programs?.some((name) => {
    const candidate = name.trim().toLowerCase();
    return candidate && (normalized.includes(candidate) || candidate.includes(normalized));
  })) : [];
  return { announcers: matched.length ? matched : announcers, label: matched.length ? "Penyiar program ini" : "Gaul Squad" };
}

/**
 * Helper utilitas untuk penyiar Gaul FM 87.8 Semarang.
 * Mengelola daftar 7 penyiar resmi dan logika on-air.
 */


/**
 * Memvalidasi apakah string host merupakan penyiar resmi studio on-air
 * (bukan generic 'Gaul FM' / 'Gaul Squad' / string kosong).
 * Mengembalikan nama host jika valid, atau string kosong "" jika belum ada yang dipilih.
 */
export function getOfficialLiveHost(currentHost?: string | null): string {
  if (!currentHost) return "";
  const trimmed = currentHost.trim();
  if (
    !trimmed ||
    trimmed.toLowerCase() === "gaul fm" ||
    trimmed.toLowerCase() === "gaul squad" ||
    trimmed.toLowerCase() === "gaul fm studio"
  ) {
    return "";
  }
  return trimmed;
}

/**
 * Cek apakah sebuah nama penyiar cocok dengan host yang sedang on-air.
 */
export function isHostOnAir(announcerName: string, currentHost?: string | null): boolean {
  const liveHost = getOfficialLiveHost(currentHost);
  if (!liveHost) return false;
  return (
    liveHost.toLowerCase().includes(announcerName.toLowerCase()) ||
    announcerName.toLowerCase().includes(liveHost.toLowerCase())
  );
}
