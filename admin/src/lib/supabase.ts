import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured =
  Boolean(url) &&
  Boolean(key) &&
  !url.includes("placeholder") &&
  !url.includes("dummy") &&
  !url.includes("your-project") &&
  key.length > 20;

/** Null when env missing — admin falls back to demo store. */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url, key)
  : null;
