import type { Banner } from "../types";

const banner1 = require("../../assets/banners/banner-1.png");
const banner2 = require("../../assets/banners/banner-2.png");
const banner3 = require("../../assets/banners/banner-3.png");
const banner4 = require("../../assets/banners/banner-4.png");

/**
 * Dashboard banners — assets from Gaul FM Semarang.
 * Supports auto-scrolling full-bleed carousel at the top of the Home screen.
 */
export const mockBanners: Banner[] = [
  {
    id: "b-1",
    type: "program",
    title: "Gaul FM 87.8 Semarang",
    subtitle: "The Best Visual Radio Station — Hits Music & Lifestyle",
    image_url: "/banners/banner-1.png",
    image_source: banner1,
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
    image_url: "/banners/banner-2.png",
    image_source: banner2,
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
    image_url: "/banners/banner-3.png",
    image_source: banner3,
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
    image_url: "/banners/banner-4.png",
    image_source: banner4,
    cta_label: "Kunjungi Web",
    link_to: null,
    link_url: "https://radiogaulfmsmg.com/",
    sort_order: 3,
    is_active: true,
  },
];
