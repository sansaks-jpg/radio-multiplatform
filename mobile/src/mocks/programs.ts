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
  // ---- Senin–Jumat ----
  ...([1, 2, 3, 4, 5] as const).flatMap((day): Program[] => [
    {
      id: `p-${day}-1`,
      name: "Gaul Pagi",
      host: "Reno & Dita",
      day_of_week: day,
      start_time: "06:00",
      end_time: "10:00",
      cover_url: cover(0),
      description:
        "Bangunin pagi kamu dengan hits terbaru, info lalu lintas Semarang, dan obrolan receh.",
    },
    {
      id: `p-${day}-2`,
      name: "Cek Sound",
      host: "Bara",
      day_of_week: day,
      start_time: "10:00",
      end_time: "13:00",
      cover_url: cover(1),
      description:
        "Seputar musik lokal, band indie Semarang, dan cerita di balik lagu.",
    },
    {
      id: `p-${day}-3`,
      name: "Gaul Siang",
      host: "Nadia",
      day_of_week: day,
      start_time: "13:00",
      end_time: "16:00",
      cover_url: cover(2),
      description: "Temenin jam kerja dan kuliah kamu dengan playlist paling gaul.",
    },
    {
      id: `p-${day}-4`,
      name: "Drive Time Gaul",
      host: "Yoga & Sinta",
      day_of_week: day,
      start_time: "16:00",
      end_time: "19:00",
      cover_url: cover(3),
      description:
        "Nemenin macet pulang: request lagu, games, dan update sore Semarang.",
    },
    {
      id: `p-${day}-5`,
      name: "Gaul Malam",
      host: "Raka",
      day_of_week: day,
      start_time: "19:00",
      end_time: "22:00",
      cover_url: cover(4),
      description: "Curhat malam, lagu galau, dan topik hangat anak muda.",
    },
    {
      id: `p-${day}-6`,
      name: "Nonstop Hits",
      host: "Gaul FM Autopilot",
      day_of_week: day,
      start_time: "22:00",
      end_time: "00:00",
      cover_url: cover(5),
      description: "Musik nonstop sampai tengah malam.",
    },
  ]),

  // ---- Sabtu ----
  {
    id: "p-6-1",
    name: "Weekend Warm-Up",
    host: "Dita",
    day_of_week: 6,
    start_time: "06:00",
    end_time: "09:00",
    cover_url: cover(0),
    description:
      "Mulai weekend dengan energi penuh dan rekomendasi acara di Semarang.",
  },
  {
    id: "p-6-2",
    name: "Gaul Request",
    host: "Bara & Nadia",
    day_of_week: 6,
    start_time: "09:00",
    end_time: "12:00",
    cover_url: cover(1),
    description: "Request lagu favorit kamu sepuasnya lewat WhatsApp studio.",
  },
  {
    id: "p-6-3",
    name: "Chart Attack",
    host: "Yoga",
    day_of_week: 6,
    start_time: "12:00",
    end_time: "15:00",
    cover_url: cover(2),
    description:
      "Countdown 20 lagu paling hits minggu ini versi pendengar Gaul FM.",
  },
  {
    id: "p-6-4",
    name: "Gaul Jalan-Jalan",
    host: "Sinta",
    day_of_week: 6,
    start_time: "15:00",
    end_time: "18:00",
    cover_url: cover(3),
    description:
      "Rekomendasi spot hangout, kuliner, dan event weekend di Semarang.",
  },
  {
    id: "p-6-5",
    name: "Sabtu Malam Live",
    host: "Raka & Bintang Tamu",
    day_of_week: 6,
    start_time: "18:00",
    end_time: "21:00",
    cover_url: cover(4),
    description: "Live session bareng musisi lokal dan gameshow interaktif.",
  },
  {
    id: "p-6-6",
    name: "Nonstop Hits",
    host: "Gaul FM Autopilot",
    day_of_week: 6,
    start_time: "21:00",
    end_time: "00:00",
    cover_url: cover(5),
    description: "Musik nonstop sampai tengah malam.",
  },

  // ---- Minggu ----
  {
    id: "p-0-1",
    name: "Minggu Santai",
    host: "Nadia",
    day_of_week: 0,
    start_time: "06:00",
    end_time: "09:00",
    cover_url: cover(6),
    description: "Playlist slow buat nemenin Minggu pagi kamu.",
  },
  {
    id: "p-0-2",
    name: "Gaul Kumpul",
    host: "Reno",
    day_of_week: 0,
    start_time: "09:00",
    end_time: "12:00",
    cover_url: cover(7),
    description: "Ngobrol bareng komunitas anak muda Semarang.",
  },
  {
    id: "p-0-3",
    name: "Throwback Sunday",
    host: "Bara",
    day_of_week: 0,
    start_time: "12:00",
    end_time: "15:00",
    cover_url: cover(0),
    description: "Hits 2000-an awal yang bikin nostalgia.",
  },
  {
    id: "p-0-4",
    name: "Gaul Sore",
    host: "Sinta",
    day_of_week: 0,
    start_time: "15:00",
    end_time: "18:00",
    cover_url: cover(1),
    description: "Santai sore sambil siap-siap menghadapi Senin.",
  },
  {
    id: "p-0-5",
    name: "Gaul Akustik",
    host: "Raka",
    day_of_week: 0,
    start_time: "18:00",
    end_time: "21:00",
    cover_url: cover(2),
    description:
      "Versi akustik lagu-lagu favorit, cocok buat malam Minggu di rumah.",
  },
  {
    id: "p-0-6",
    name: "Nonstop Hits",
    host: "Gaul FM Autopilot",
    day_of_week: 0,
    start_time: "21:00",
    end_time: "00:00",
    cover_url: cover(3),
    description: "Musik nonstop sampai tengah malam.",
  },
];
