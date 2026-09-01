import type { NowPlaying } from "../types";

/**
 * Demo Now Playing — studio photo from radiogaulfmsmg.com.
 * Overridden by schedule match / Supabase when available.
 */
export const mockNowPlaying: NowPlaying = {
  id: "demo-now-playing",
  current_program: "Gaul FM Live",
  current_host: "87.8 Gaul FM Semarang",
  current_cover_url:
    "https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-28-at-11.36.02.jpeg",
  updated_at: new Date().toISOString(),
};
