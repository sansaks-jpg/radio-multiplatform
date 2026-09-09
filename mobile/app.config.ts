import type { ExpoConfig, ConfigContext } from "expo/config";

/**
 * Gaul FM Semarang — Expo app config.
 *
 * Env (see .env.example):
 *   EXPO_PUBLIC_SUPABASE_URL      — Supabase project URL
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY — Supabase anon key
 * Both are optional for UI development: the app falls back to bundled mock
 * data and a demo auth mode when they are missing.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Gaul FM",
  slug: "gaulfm-mobile",
  version: "0.1.0",
  icon: "./assets/icon.png",
  orientation: "portrait",
  scheme: "gaulfm",
  userInterfaceStyle: "automatic",
  backgroundColor: "#050505",
  // Enable New Architecture for Expo SDK 54 / Reanimated 4 / Worklets compatibility
  newArchEnabled: true,
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.gaulfm.app",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    infoPlist: {
      // Background audio keeps the live stream playing with the screen locked.
      UIBackgroundModes: ["audio"],
    },
  },
  android: {
    package: "com.gaulfm.app",
    userInterfaceStyle: "automatic",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#FFFFFF",
    },
    // resize: window shrinks with keyboard (forms + live chat composer).
    // Requires rebuild of native app after change (not just Metro reload).
    softwareKeyboardLayoutMode: "resize",
    permissions: [
      "INTERNET",
      "WAKE_LOCK",
      "FOREGROUND_SERVICE",
      "FOREGROUND_SERVICE_MEDIA_PLAYBACK",
      "POST_NOTIFICATIONS",
      "ACCESS_FINE_LOCATION",
    ],
  },
  web: {
    bundler: "metro",
    favicon: "./assets/favicon.png",
  },
  plugins: [
    // The Icecast stream is plain HTTP (http://27.50.19.173:9000) — allow
    // cleartext so playback does not silently fail on Android 9+.
    ["expo-build-properties", { android: { usesCleartextTraffic: true } }],
    // Native splash — light background (#F3F6F4) / dark (#050505) + centered brand logo. Kept
    // visible via SplashScreen.preventAutoHideAsync() in App.tsx until the
    // full bootstrap (fonts, stores, player engine) resolves.
    [
      "expo-splash-screen",
      {
        backgroundColor: "#F3F6F4",
        image: "./assets/icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        dark: {
          backgroundColor: "#050505",
          image: "./assets/icon.png",
        },
      },
    ],
    ["expo-notifications", { color: "#FF3B30" }],
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "Gaul FM menggunakan lokasi kamu sekali saat pendaftaran untuk personalisasi konten lokal Semarang.",
      },
    ],
  ],
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
    // Stream integration contract (MOBILE_FRONTEND_PLAN.md §0)
    streamPlaylistUrl: "http://27.50.19.173:9000/gaulfm.m3u",
    streamFallbackUrl: "http://27.50.19.173:9000/gaulfm",
    // MediaMTX Visual Radio Endpoints (WebRTC / WHEP Mode + HLS Fallback)
    visualStreamRtmpUrl:
      process.env.EXPO_PUBLIC_VISUAL_STREAM_RTMP_URL ??
      "rtmp://40.81.231.250:1935/gaulfm_webrtc",
    visualStreamWhepUrl:
      process.env.EXPO_PUBLIC_VISUAL_STREAM_WHEP_URL ??
      "http://40.81.231.250:8889/gaulfm_webrtc/whep",
    visualStreamHlsUrl:
      process.env.EXPO_PUBLIC_VISUAL_STREAM_HLS_URL ??
      "http://40.81.231.250:8888/gaulfm_webrtc/index.m3u8",
  },
});
