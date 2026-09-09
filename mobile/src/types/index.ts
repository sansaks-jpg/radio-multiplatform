import type { NavigatorScreenParams } from "@react-navigation/native";

/**
 * Shared domain types — mirror the Supabase schema in PRD §5
 * (tables: now_playing, programs, news, profiles) plus navigation params.
 */

export type PlayerStatus = "idle" | "buffering" | "playing" | "paused" | "error";

export interface NowPlaying {
  id?: string;
  current_program: string;
  current_host: string;
  current_cover_url: string | null;
  updated_at?: string;
}

export interface LiveComment {
  id: string;
  user_name: string;
  avatar_seed?: string | null;
  message: string;
  created_at: string;
  is_highlighted?: boolean;
  is_hidden?: boolean;
  is_broadcaster?: boolean;
}

export interface Announcer {
  id: string;
  name: string;
  nickname?: string | null;
  photo_url: string;
  bio?: string | null;
  instagram?: string | null;
  is_active?: boolean;
  sort_order?: number;
}

/**
 * day_of_week follows the JavaScript Date.getDay() convention:
 * 0 = Sunday (Minggu) … 6 = Saturday (Sabtu).
 */
export interface Program {
  id: string;
  name: string;
  host: string;
  day_of_week: number;
  start_time: string; // "HH:mm" (24h, WIB)
  end_time: string; // "HH:mm" — may cross midnight
  cover_url: string | null;
  description: string;
}

export interface NewsItem {
  id: string;
  wp_post_id: number | null;
  title: string;
  /** Raw body as synced from WordPress — may contain HTML markup. */
  content: string;
  image_url: string | null;
  category: string | null;
  published_at: string;
  url?: string | null;
  synced_at?: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  whatsapp: string | null;
  device_os: string | null;
  device_model: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  push_token: string | null;
  last_login: string | null;
}

/**
 * Promo banner — featured program / event / ad slot shown on the Home
 * dashboard as an auto-scrolling carousel. Mirrors the future Supabase
 * `banners` table (not in PRD §5 yet — wire up when admin lands).
 */
export type BannerType = "program" | "event" | "ad";

export interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  /** Optional bundled local image require() asset */
  image_source?: number | string | Record<string, unknown>;
  cta_label: string | null;
  /** Tab to navigate to when tapped. */
  link_to: "schedule" | "news" | "profile" | null;
  /** External URL to open via Linking when tapped. */
  link_url: string | null;
  type: BannerType;
  sort_order: number;
  is_active?: boolean;
}

/* ---------------- Navigation param lists ---------------- */

export type RootStackParamList = {
  Splash: undefined;
  /** First-launch onboarding carousel — shown once per install. */
  Onboarding: undefined;
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { accessToken?: string } | undefined;
};

export type MainTabParamList = {
  Home: undefined;
  /** Nested stack: schedule timeline + program detail page. */
  Schedule: NavigatorScreenParams<ScheduleStackParamList> | undefined;
  /** Allows deep-linking into a specific News screen from the Home tab. */
  News: NavigatorScreenParams<NewsStackParamList> | undefined;
  /** Allows deep-linking into About from anywhere. */
  Profile: NavigatorScreenParams<ProfileStackParamList> | undefined;
};

/** Schedule tab stack — day schedule + program detail. */
export type ScheduleStackParamList = {
  ScheduleList: undefined;
  ProgramDetail: { id: string; fromHome?: boolean };
};

export type NewsStackParamList = {
  NewsFeed: undefined;
  /**
   * Article reader.
   * `fromHome` — opened from Home dashboard; back must return to Home tab
   * (not a leftover NewsFeed / previous article).
   */
  NewsDetail: { id: string; fromHome?: boolean };
};

/** Profile tab stack — ProfileHome hub, AppSettings (gear), About. */
export type ProfileStackParamList = {
  ProfileHome: undefined;
  EditProfile: undefined;
  AppSettings: undefined;
  About: undefined;
};
