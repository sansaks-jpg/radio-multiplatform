import type { Program } from "../types";

/**
 * Demo weekly schedule (day_of_week: 0 = Minggu … 6 = Sabtu).
 * Cover photos from radiogaulfmsmg.com studio gallery (prototype).
 * Schedule page on web is empty — slots keep CHR-style placeholders until admin CRUD.
 */

const COVERS = [
  "https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-28-at-11.36.02.jpeg",
  "https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-28-at-11.33.37.jpeg",
  "https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-26-at-12.28.41.jpeg",
  "https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-25-at-15.19.18.jpeg",
  "https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-25-at-12.15.45-1.jpeg",
  "https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-22-at-13.34.42.jpeg",
  "https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-21-at-11.28.17.jpeg",
  "https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-21-at-11.17.34.jpeg",
] as const;

function cover(i: number): string {
  return COVERS[i % COVERS.length]!;
}

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
      cover_url: cover(0),
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
      cover_url: cover(3),
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
      cover_url: cover(4),
      description:
        "Asupan musik paling hits malam hari di 87.8 FM bareng Raka: playlist terbaik, request lagu, dan curhat anak muda.",
    },
  ]),
];
