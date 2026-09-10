import type { Program } from "../types";

/**
 * Demo weekly schedule (day_of_week: 0 = Minggu … 6 = Sabtu).
 * Menggunakan cover logo resmi Gaul FM.
 */

export const mockPrograms: Program[] = [
  // ---- Senin–Jumat (Berdasarkan Jadwal Banner Resmi Gaul FM) ----
  ...([1, 2, 3, 4, 5] as const).flatMap((day): Program[] => [
    {
      id: `p-${day}-1`,
      name: "Gaul Morning Show",
      host: "Reno & Dita",
      day_of_week: day,
      start_time: "07:00",
      end_time: "10:00",
      cover_url:
        "https://idnxegollxhdcoexvndx.supabase.co/storage/v1/object/public/programs/gaul-morning-show.png",
      description:
        "Mulai pagi kamu dengan hits terbaru, info lalu lintas Semarang, dan obrolan seru bareng Reno & Dita di Gaul Morning Show.",
    },
    {
      id: `p-${day}-2`,
      name: "Gaul Waktu Setempat",
      host: "Yoga & Sinta",
      day_of_week: day,
      start_time: "15:00",
      end_time: "18:00",
      cover_url:
        "https://idnxegollxhdcoexvndx.supabase.co/storage/v1/object/public/programs/gaul-waktu-setempat.png",
      description:
        "Nemenin sore perjalanan pulang kamu dengan musik hits, obrolan santai, dan info terkini waktu setempat di 87.8 MHz.",
    },
    {
      id: `p-${day}-3`,
      name: "Asupan Gaul",
      host: "Raka",
      day_of_week: day,
      start_time: "19:00",
      end_time: "22:00",
      cover_url:
        "https://idnxegollxhdcoexvndx.supabase.co/storage/v1/object/public/programs/asupan-gaul.png",
      description:
        "Asupan musik paling hits malam hari di 87.8 FM bareng Raka: playlist terbaik, request lagu, dan curhat anak muda.",
    },
  ]),
];
