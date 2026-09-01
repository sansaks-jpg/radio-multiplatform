import type { NewsItem } from "../types";

/**
 * Demo news feed — shown when Supabase is not configured.
 * Content uses simple HTML paragraphs like the WordPress sync produces.
 */
export const mockNews: NewsItem[] = [
  {
    id: "n-1",
    wp_post_id: 101,
    title: "Festival Kuliner Simpang Lima Kembali Digelar Akhir Pekan Ini",
    content:
      "<p>Festival kuliner tahunan di kawasan Simpang Lima Semarang kembali digelar akhir pekan ini dengan lebih dari 80 tenant UMKM lokal.</p><p>Pengunjung bisa menikmati lumpia, wingko babat, hingga kopi robusta khas Jateng mulai pukul 16.00 WIB sampai 22.00 WIB.</p><p>Gaul FM akan siaran langsung dari panggung utama pada Sabtu malam bersama Raka dan bintang tamu spesial.</p>",
    image_url: "https://picsum.photos/seed/kuliner-simpang/800/450",
    category: "Event",
    published_at: "2026-07-17T09:00:00+07:00",
  },
  {
    id: "n-2",
    wp_post_id: 102,
    title: "Band Indie Semarang Rilis Single Baru, Debut di Chart Attack",
    content:
      "<p>Band indie asal Tembalang merilis single terbaru mereka minggu ini dan langsung masuk nominasi Chart Attack Gaul FM.</p><p>Vokalisnya menyebut lagu ini terinspirasi dari perjalanan pulang lewat jalur Pantura saat senja.</p>",
    image_url: "https://picsum.photos/seed/band-indie/800/450",
    category: "Musik",
    published_at: "2026-07-16T15:30:00+07:00",
  },
  {
    id: "n-3",
    wp_post_id: 103,
    title: "Jadwal CFD Jalan Pahlawan Diperpanjang Selama Juli",
    content:
      "<p>Pemkot Semarang memperpanjang durasi car free day di Jalan Pahlawan selama bulan Juli, mulai pukul 05.30 hingga 09.30 WIB.</p><p>Perpanjangan ini merespons antusiasme warga yang makin ramai berolahraga setiap Minggu pagi.</p>",
    image_url: "https://picsum.photos/seed/cfd-pahlawan/800/450",
    category: "Lokal",
    published_at: "2026-07-15T07:45:00+07:00",
  },
  {
    id: "n-4",
    wp_post_id: 104,
    title: "Gaul FM Buka Audisi Penyiar Baru untuk Mahasiswa",
    content:
      "<p>Buat kamu mahasiswa yang suka ngomong dan update musik, Gaul FM membuka audisi penyiar paruh waktu bulan ini.</p><p>Syaratnya sederhana: kirim voice demo 60 detik lewat WhatsApp studio dan siap ikut workshop dua pekan.</p><p>Pendaftaran ditutup 31 Juli 2026.</p>",
    image_url: "https://picsum.photos/seed/audisi-penyiar/800/450",
    category: "Kampus",
    published_at: "2026-07-14T11:20:00+07:00",
  },
  {
    id: "n-5",
    wp_post_id: 105,
    title: "Kota Lama Masuk Daftar Destinasi Favorit Anak Muda 2026",
    content:
      "<p>Kawasan Kota Lama Semarang masuk daftar destinasi paling banyak dikunjungi anak muda Jawa Tengah tahun ini.</p><p>Selain spot foto kolonial, deretan kafe dan galeri seni baru jadi magnet utama akhir pekan.</p>",
    image_url: "https://picsum.photos/seed/kota-lama/800/450",
    category: "Lokal",
    published_at: "2026-07-13T13:10:00+07:00",
  },
  {
    id: "n-6",
    wp_post_id: 106,
    title: "Prambanan Jazz Umumkan Lineup, Tiga Musisi Semarang Ikut Tampil",
    content:
      "<p>Festival Prambanan Jazz resmi mengumumkan lineup tahun ini, dan tiga musisi asal Semarang dipastikan tampil di panggung komunitas.</p><p>Gaul FM akan membagikan tiket gratis lewat program Gaul Request pekan depan.</p>",
    image_url: "https://picsum.photos/seed/jazz-lineup/800/450",
    category: "Musik",
    published_at: "2026-07-12T10:05:00+07:00",
  },
  {
    id: "n-7",
    wp_post_id: 107,
    title: "Tips Hemat Kuota Saat Streaming Radio Sepanjang Hari",
    content:
      "<p>Streaming radio di 96–128 kbps hanya menghabiskan sekitar 45–60 MB per jam, jauh lebih hemat dibanding menonton video.</p><p>Aktifkan mode hemat data di ponselmu dan gunakan WiFi saat mengunduh berita atau podcast favorit.</p>",
    image_url: "https://picsum.photos/seed/hemat-kuota/800/450",
    category: "Tips",
    published_at: "2026-07-11T08:40:00+07:00",
  },
  {
    id: "n-8",
    wp_post_id: 108,
    title: "Turnamen E-Sport Kampus se-Semarang Digelar di Paragon Mall",
    content:
      "<p>Delapan kampus se-Semarang akan bertanding di turnamen e-sport akhir bulan ini di atrium Paragon Mall.</p><p>Grand final akan disiarkan langsung dan dipandu tim Gaul Malam.</p>",
    image_url: "https://picsum.photos/seed/esport-kampus/800/450",
    category: "Event",
    published_at: "2026-07-10T16:15:00+07:00",
  },
];
