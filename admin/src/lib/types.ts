/**
 * Domain types — mirror Supabase schema (PRD §5) + mobile app types.
 * Wire to real backend by swapping lib/data.ts only.
 */

export interface NowPlaying {
  id: string;
  current_program: string;
  current_host: string;
  current_cover_url: string | null;
  updated_at: string;
}

/** day_of_week: 0 = Sunday … 6 = Saturday (JS Date.getDay) */
export interface Program {
  id: string;
  name: string;
  host: string;
  day_of_week: number;
  start_time: string; // "HH:mm"
  end_time: string;
  cover_url: string | null;
  description: string;
}

export interface NewsItem {
  id: string;
  wp_post_id: number | null;
  title: string;
  content: string;
  image_url: string | null;
  category: string | null;
  published_at: string;
  synced_at: string;
  url?: string | null;
}

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  whatsapp: string | null;
  gender?: string | null;
  device_os: string | null;
  device_model: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  push_token: string | null;
  last_login: string | null;
  created_at: string;
}

export type BannerType = "program" | "event" | "ad";

export interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  cta_label: string | null;
  link_to: "schedule" | "news" | "profile" | null;
  link_url: string | null;
  type: BannerType;
  sort_order: number;
  is_active: boolean;
}

export interface StreamSettings {
  // Audio streaming (Icecast)
  audioPrimaryUrl: string;
  audioFallbackUrl: string;
  audioMountPoint: string;
  audioBitrate: string;
  audioFormat: string;
  audioAutoReconnect: boolean;

  // Visual streaming (MediaMTX / vMix / WebRTC / HLS)
  visualRtmpServer: string;
  visualStreamKey: string;
  visualWhepUrl: string;
  visualHlsUrl: string;
  visualEnabled: boolean;

  // Timestamps
  updated_at: string;
}

export interface Announcer {
  id: string;
  name: string;
  nickname: string | null;
  photo_url: string;
  bio: string | null;
  instagram: string | null;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
}

export interface AdminSnapshot {
  nowPlaying: NowPlaying;
  programs: Program[];
  announcers: Announcer[];
  news: NewsItem[];
  profiles: Profile[];
  banners: Banner[];
  streamSettings: StreamSettings;
  sheetsSyncStatus: "ok" | "error" | "idle";
  lastNewsSyncAt: string | null;
}

