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
      host: "Penyiar Gaul FM",
      day_of_week: day,
      start_time: "07:00",
      end_time: "10:00",
      cover_url: "/programs/gaul-morning-show.png",
      description:
        "Program pagi yang membahas info terkini, topik viral, lifestyle anak muda, sampai obrolan relate yang beda setiap hari biar Gaulista nggak bosan dan selalu punya hal baru buat ditemenin tiap pagi.",
    },
    {
      id: `p-${day}-2`,
      name: "Gaul Waktu Setempat",
      host: "Penyiar Gaul FM",
      day_of_week: day,
      start_time: "15:00",
      end_time: "18:00",
      cover_url: "/programs/gaul-waktu-setempat.png",
      description:
        "Program unggulan seputar pembahasan dunia music terkini dilengkapi request lagu dan salam serta playlist lagu yang up to date.",
    },
    {
      id: `p-${day}-3`,
      name: "Asupan Gaul",
      host: "Penyiar Gaul FM",
      day_of_week: day,
      start_time: "19:00",
      end_time: "22:00",
      cover_url: "/programs/asupan-gaul.png",
      description:
        "Program acara malam seputar romance dengan playlist lagu slow yang menarik disertai request lagu dan curhat yang bikin asik.",
    },
  ]),
];
