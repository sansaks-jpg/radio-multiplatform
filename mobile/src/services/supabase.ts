import "react-native-url-polyfill/auto";
import { AppState, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;

export const SUPABASE_URL: string =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? (extra.supabaseUrl as string) ?? "";
export const SUPABASE_ANON_KEY: string =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  (extra.supabaseAnonKey as string) ??
  "";

/**
 * When credentials are missing the whole app runs in demo mode:
 * data hooks serve bundled mocks and auth accepts a local demo session.
 */
export const isSupabaseConfigured: boolean =
  SUPABASE_URL.startsWith("http") && SUPABASE_ANON_KEY.length > 20;

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === "web",
      },
    });
    // Auto-refresh tokens only while the app is foregrounded (Supabase RN guide).
    AppState.addEventListener("change", (state) => {
      if (!client) return;
      if (state === "active") {
        void client.auth.startAutoRefresh();
      } else {
        void client.auth.stopAutoRefresh();
      }
    });
  }
  return client;
}
