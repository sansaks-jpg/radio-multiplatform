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
    "https://idnxegollxhdcoexvndx.supabase.co/storage/v1/object/public/programs/gaul-morning-show.png",
  updated_at: new Date().toISOString(),
};
