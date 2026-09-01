import type { Banner } from "../types";

/**
 * Dashboard banners — images from radiogaulfmsmg.com.
 * CTAs only go to unique destinations (YouTube, IG, web article).
 * Never link_to tab routes (schedule / news / profile) — those already
 * live in the bottom tab bar.
 */
export const mockBanners: Banner[] = [
  {
    id: "b-1",
    type: "program",
    title: "87.8 Gaul FM - Visual Radio",
    subtitle: "Streaming live di YouTube — The Best Visual Radio Station",
    image_url:
      "https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-28-at-11.36.02.jpeg",
    cta_label: "Tonton live",
    link_to: null,
    link_url: "https://www.youtube.com/@radiogaulfm_smg",
    sort_order: 0,
    is_active: true,
  },
  {
    id: "b-2",
    type: "event",
    title: "Pollux Hotel Group Appreciation Lunch 2026",
    subtitle: "Kolaborasi MICE di Semarang — baca di Info Gaul",
    image_url:
      "https://radiogaulfmsmg.com/wp-content/uploads/2026/07/kembali-ke-semarang-1.jpg.jpeg",
    cta_label: "Baca di web",
    link_to: null,
    link_url: "https://radiogaulfmsmg.com/",
    sort_order: 1,
    is_active: true,
  },
  {
    id: "b-3",
    type: "program",
    title: "Studio Gaul FM Semarang",
    subtitle: "Radio anak muda 15-29 — CHR hits tiap hari",
    image_url:
      "https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-26-at-12.28.41.jpeg",
    cta_label: null,
    link_to: null,
    link_url: null,
    sort_order: 2,
    is_active: true,
  },
  {
    id: "b-4",
    type: "ad",
    title: "Follow @radiogaulfm_smg",
    subtitle: "Instagram · TikTok · YouTube — update buat Gaulista",
    image_url:
      "https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-25-at-15.19.18.jpeg",
    cta_label: "Instagram",
    link_to: null,
    link_url: "https://www.instagram.com/radiogaulfm_smg/",
    sort_order: 3,
    is_active: true,
  },
];
