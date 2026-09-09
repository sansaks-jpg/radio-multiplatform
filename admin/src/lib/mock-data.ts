import type {
  AdminSnapshot,
  Banner,
  NewsItem,
  NowPlaying,
  Profile,
  Program,
  StreamSettings,
} from "./types";

const COVERS = [
  "https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-28-at-11.36.02.jpeg",
  "https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-28-at-11.33.37.jpeg",
  "https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-26-at-12.28.41.jpeg",
  "https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-25-at-15.19.18.jpeg",
  "https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-25-at-12.15.45-1.jpeg",
  "https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-22-at-13.34.42.jpeg",
] as const;

function cover(i: number) {
  return COVERS[i % COVERS.length]!;
}

/** Weekday template based on official banner-2.png (Senin–Jumat) */
function buildPrograms(): Program[] {
  const weekday = [
    {
      name: "Gaul Morning Show",
      host: "Reno & Dita",
      start_time: "07:00",
      end_time: "10:00",
      description:
        "Mulai pagi dengan hits terbaru, info lalu lintas Semarang, dan obrolan seru bareng Reno & Dita.",
      cover: 0,
    },
    {
      name: "Gaul Waktu Setempat",
      host: "Yoga & Sinta",
      start_time: "15:00",
      end_time: "18:00",
      description:
        "Nemenin sore pulang: musik hits, obrolan santai, dan update waktu setempat di 87.8 MHz.",
      cover: 3,
    },
    {
      name: "Asupan Gaul",
      host: "Raka",
      start_time: "19:00",
      end_time: "22:00",
      description:
        "Asupan musik gaul malam hari di 87.8 FM: playlist pilihan, curhat, dan obrolan hangat anak muda.",
      cover: 4,
    },
  ];

  const list: Program[] = [];
  for (const day of [1, 2, 3, 4, 5]) {
    weekday.forEach((p, i) => {
      list.push({
        id: `p-${day}-${i + 1}`,
        name: p.name,
        host: p.host,
        day_of_week: day,
        start_time: p.start_time,
        end_time: p.end_time,
        cover_url: cover(p.cover),
        description: p.description,
      });
    });
  }

  // Weekend (Sabtu & Minggu): Kosong / musik nonstop 24 jam
  return list;
}

const seedPrograms = buildPrograms();

export const seedNowPlaying: NowPlaying = {
  id: "demo-now-playing",
  current_program: "Gaul Waktu Setempat",
  current_host: "Yoga & Sinta",
  current_cover_url: cover(3),
  updated_at: "2026-07-19T09:00:00+07:00",
};

export const seedNews: NewsItem[] = [
  {
    id: "n-1",
    wp_post_id: 101,
    title: "Festival Kuliner Simpang Lima Kembali Digelar Akhir Pekan Ini",
    content:
      "<p>Festival kuliner tahunan di kawasan Simpang Lima Semarang kembali digelar.</p>",
    image_url: "https://picsum.photos/seed/kuliner-simpang/800/450",
    category: "Event",
    published_at: "2026-07-17T09:00:00+07:00",
    synced_at: "2026-07-17T09:15:00+07:00",
  },
  {
    id: "n-2",
    wp_post_id: 102,
    title: "Band Indie Semarang Rilis Single Baru, Debut di Chart Attack",
    content: "<p>Band indie asal Tembalang merilis single terbaru.</p>",
    image_url: "https://picsum.photos/seed/band-indie/800/450",
    category: "Musik",
    published_at: "2026-07-16T15:30:00+07:00",
    synced_at: "2026-07-16T15:45:00+07:00",
  },
  {
    id: "n-3",
    wp_post_id: 103,
    title: "Jadwal CFD Jalan Pahlawan Diperpanjang Selama Juli",
    content: "<p>CFD Jalan Pahlawan diperpanjang setiap Minggu Juli.</p>",
    image_url: "https://picsum.photos/seed/cfd-pahlawan/800/450",
    category: "Kota",
    published_at: "2026-07-15T08:00:00+07:00",
    synced_at: "2026-07-15T08:20:00+07:00",
  },
  {
    id: "n-4",
    wp_post_id: 104,
    title: "Audisi Penyiar Gaul FM 2026 Dibuka",
    content: "<p>Pendaftaran audisi penyiar dibuka hingga akhir bulan.</p>",
    image_url: "https://picsum.photos/seed/audisi-penyiar/800/450",
    category: "Station",
    published_at: "2026-07-14T10:00:00+07:00",
    synced_at: "2026-07-14T10:10:00+07:00",
  },
];

export const seedProfiles: Profile[] = [
  {
    id: "u-1",
    full_name: "Aditya Pratama",
    email: "aditya@email.com",
    whatsapp: "081234567890",
    device_os: "Android",
    device_model: "Samsung Galaxy A54",
    city: "Semarang",
    latitude: -6.9667,
    longitude: 110.4167,
    push_token: "tok_demo_1",
    last_login: "2026-07-19T08:12:00+07:00",
    created_at: "2026-06-01T10:00:00+07:00",
  },
  {
    id: "u-2",
    full_name: "Nadya Salsabila",
    email: "nadya@email.com",
    whatsapp: "081298765432",
    device_os: "iOS",
    device_model: "iPhone 14",
    city: "Ungaran",
    latitude: -7.1397,
    longitude: 110.405,
    push_token: "tok_demo_2",
    last_login: "2026-07-19T07:40:00+07:00",
    created_at: "2026-06-05T14:20:00+07:00",
  },
  {
    id: "u-3",
    full_name: "Reno Wibowo",
    email: "reno@email.com",
    whatsapp: "082112223333",
    device_os: "Android",
    device_model: "Xiaomi 13T",
    city: "Demak",
    latitude: -6.8947,
    longitude: 110.6396,
    push_token: null,
    last_login: "2026-07-18T21:05:00+07:00",
    created_at: "2026-06-12T09:30:00+07:00",
  },
  {
    id: "u-4",
    full_name: "Putri Ayu",
    email: "putri@email.com",
    whatsapp: "085677889900",
    device_os: "iOS",
    device_model: "iPhone 15 Pro",
    city: "Semarang",
    latitude: -6.99,
    longitude: 110.42,
    push_token: "tok_demo_4",
    last_login: "2026-07-19T09:01:00+07:00",
    created_at: "2026-07-01T11:00:00+07:00",
  },
  {
    id: "u-5",
    full_name: "Joko Santoso",
    email: "joko@email.com",
    whatsapp: "081355667788",
    device_os: "Android",
    device_model: "OPPO Reno 10",
    city: "Salatiga",
    latitude: -7.3305,
    longitude: 110.5084,
    push_token: "tok_demo_5",
    last_login: "2026-07-17T18:22:00+07:00",
    created_at: "2026-07-10T16:45:00+07:00",
  },
];

export const seedBanners: Banner[] = [
  {
    id: "b-1",
    type: "program",
    title: "Gaul FM 87.8 Semarang",
    subtitle: "The Best Visual Radio Station — Hits Music & Lifestyle",
    image_url:
      "https://idnxegollxhdcoexvndx.supabase.co/storage/v1/object/public/banners/banner-1.png",
    cta_label: "Tonton live",
    link_to: null,
    link_url: "https://www.youtube.com/@radiogaulfm_smg",
    sort_order: 0,
    is_active: true,
  },
  {
    id: "b-2",
    type: "program",
    title: "Jadwal Siaran Gaul FM",
    subtitle: "Gaul Morning Show, Gaul Waktu Setempat & Asupan Gaul",
    image_url:
      "https://idnxegollxhdcoexvndx.supabase.co/storage/v1/object/public/banners/banner-2.png",
    cta_label: "Lihat Jadwal",
    link_to: "schedule",
    link_url: null,
    sort_order: 1,
    is_active: true,
  },
  {
    id: "b-3",
    type: "event",
    title: "Gaulista Community",
    subtitle: "Radio anak muda hits 15-29 tahun di Semarang",
    image_url:
      "https://idnxegollxhdcoexvndx.supabase.co/storage/v1/object/public/banners/banner-3.png",
    cta_label: "Instagram",
    link_to: null,
    link_url: "https://www.instagram.com/radiogaulfm_smg/",
    sort_order: 2,
    is_active: true,
  },
  {
    id: "b-4",
    type: "ad",
    title: "radiogaulfmsmg.com",
    subtitle: "Kunjungi portal web resmi Radio Gaul FM Semarang",
    image_url:
      "https://idnxegollxhdcoexvndx.supabase.co/storage/v1/object/public/banners/banner-4.png",
    cta_label: "Kunjungi Web",
    link_to: null,
    link_url: "https://radiogaulfmsmg.com",
    sort_order: 3,
    is_active: true,
  },
];

export const seedStreamSettings: StreamSettings = {
  audioPrimaryUrl: "http://27.50.19.173:9000/gaulfm.m3u",
  audioFallbackUrl: "http://27.50.19.173:9000/gaulfm",
  audioMountPoint: "/gaulfm",
  audioBitrate: "128 kbps",
  audioFormat: "AAC / MP3",
  audioAutoReconnect: true,
  visualRtmpServer: "rtmp://40.81.231.250:1935",
  visualStreamKey: "gaulfm_webrtc",
  visualWhepUrl: "http://40.81.231.250:8889/gaulfm_webrtc/whep",
  visualHlsUrl: "http://40.81.231.250:8888/gaulfm_webrtc/index.m3u8",
  visualEnabled: true,
  updated_at: new Date().toISOString(),
};

export function createSeedSnapshot(): AdminSnapshot {
  return {
    nowPlaying: { ...seedNowPlaying },
    programs: seedPrograms.map((p) => ({ ...p })),
    news: seedNews.map((n) => ({ ...n })),
    profiles: seedProfiles.map((p) => ({ ...p })),
    banners: seedBanners.map((b) => ({ ...b })),
    streamSettings: { ...seedStreamSettings },
    sheetsSyncStatus: "ok",
    lastNewsSyncAt: seedNews[0]?.synced_at ?? null,
  };
}
