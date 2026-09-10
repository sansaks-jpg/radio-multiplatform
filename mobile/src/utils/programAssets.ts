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

export interface OfficialProgramInfo {
  name: string;
  host: string;
  schedule: string;
  days: string;
  description: string;
}

export const OFFICIAL_PROGRAM_INFO: Record<string, OfficialProgramInfo> = {
  "Gaul Morning Show": {
    name: "Gaul Morning Show",
    host: "Penyiar Gaul FM",
    schedule: "07:00 – 10:00 WIB",
    days: "Senin – Jumat",
    description:
      "Program pagi yang membahas info terkini, topik viral, lifestyle anak muda, sampai obrolan relate yang beda setiap hari biar Gaulista nggak bosan dan selalu punya hal baru buat ditemenin tiap pagi.",
  },
  "Gaul Waktu Setempat": {
    name: "Gaul Waktu Setempat",
    host: "Penyiar Gaul FM",
    schedule: "15:00 – 18:00 WIB",
    days: "Senin – Jumat",
    description:
      "Program unggulan seputar pembahasan dunia music terkini dilengkapi request lagu dan salam serta playlist lagu yang up to date.",
  },
  "Asupan Gaul": {
    name: "Asupan Gaul",
    host: "Penyiar Gaul FM",
    schedule: "19:00 – 22:00 WIB",
    days: "Senin – Jumat",
    description:
      "Program acara malam seputar romance dengan playlist lagu slow yang menarik disertai request lagu dan curhat yang bikin asik.",
  },
};

/**
 * Mengembalikan info detail resmi program (nama, penyiar, jadwal, deskripsi)
 * dengan fallback cerdas jika data API Supabase belum terisi.
 */
export function getProgramInfo(programName?: string | null): OfficialProgramInfo {
  if (programName) {
    const trimmed = programName.trim();
    if (OFFICIAL_PROGRAM_INFO[trimmed]) {
      return OFFICIAL_PROGRAM_INFO[trimmed];
    }
    const lower = trimmed.toLowerCase();
    if (lower.includes("morning")) return OFFICIAL_PROGRAM_INFO["Gaul Morning Show"];
    if (lower.includes("setempat") || lower.includes("waktu")) return OFFICIAL_PROGRAM_INFO["Gaul Waktu Setempat"];
    if (lower.includes("asupan")) return OFFICIAL_PROGRAM_INFO["Asupan Gaul"];
  }

  return {
    name: programName?.trim() || "Gaul FM Semarang",
    host: "Penyiar Gaul FM",
    schedule: "24 Jam Non-Stop",
    days: "Setiap Hari",
    description:
      "Streaming siaran radio Gaul FM 87.8 MHz Semarang. Musik hits terbaik anak muda, info viral terkini, dan interaksi live chat langsung dari studio.",
  };
}
