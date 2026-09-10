import type { ImageSource } from "expo-image";

export const GAUL_MORNING_SHOW_COVER = require("../../assets/programs/gaul-morning-show.png");
export const GAUL_WAKTU_SETEMPAT_COVER = require("../../assets/programs/gaul-waktu-setempat.png");
export const ASUPAN_GAUL_COVER = require("../../assets/programs/asupan-gaul.png");

export const OFFICIAL_PROGRAM_COVERS: Record<string, any> = {
  "Gaul Morning Show": GAUL_MORNING_SHOW_COVER,
  "Gaul Waktu Setempat": GAUL_WAKTU_SETEMPAT_COVER,
  "Asupan Gaul": ASUPAN_GAUL_COVER,
};

/**
 * Mengembalikan ImageSource resmi untuk program siaran berdasarkan nama program
 * atau fallback ke coverUrl / default program cover.
 */
export function getProgramArtwork(
  programName?: string | null,
  coverUrl?: string | null
): ImageSource {
  if (programName) {
    const trimmed = programName.trim();
    if (OFFICIAL_PROGRAM_COVERS[trimmed]) {
      return OFFICIAL_PROGRAM_COVERS[trimmed];
    }
    const lower = trimmed.toLowerCase();
    if (lower.includes("morning")) return GAUL_MORNING_SHOW_COVER;
    if (lower.includes("setempat") || lower.includes("waktu")) return GAUL_WAKTU_SETEMPAT_COVER;
    if (lower.includes("asupan")) return ASUPAN_GAUL_COVER;
  }

  // Jika ada custom cover_url dari Supabase dan bukan link dummy whatsapp prototype lama
  if (coverUrl && !coverUrl.includes("WhatsApp-Image")) {
    return { uri: coverUrl };
  }

  return GAUL_MORNING_SHOW_COVER;
}
