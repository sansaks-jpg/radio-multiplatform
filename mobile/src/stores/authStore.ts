import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "../services/supabase";
import { getDeviceSummary } from "../services/deviceInfo";
import { captureLocationOnce } from "../services/location";
import { registerPushToken } from "../services/notifications";
import type { Profile } from "../types";

export interface RegisterPayload {
  fullName: string;
  email: string;
  whatsapp: string;
  city?: string;
  password: string;
}

interface AuthStoreState {
  session: Session | null;
  profile: Profile | null;
  /** True while the persisted session is being restored at app start. */
  initializing: boolean;
  restore: () => Promise<void>;
  /** Returns null on success, or an Indonesian error message. */
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (payload: RegisterPayload) => Promise<string | null>;
  signOut: () => Promise<void>;
  setProfile: (profile: Profile | null) => void;
}

function demoSession(email: string): Session {
  // Local-only session so the UI is fully explorable without a backend.
  return {
    access_token: "demo-access-token",
    refresh_token: "demo-refresh-token",
    token_type: "bearer",
    expires_in: 3600,
    user: { id: "demo-user", email, aud: "authenticated" },
  } as unknown as Session;
}

function demoProfile(email: string): Profile {
  return {
    id: "demo-user",
    full_name: "Pendengar Gaul",
    email,
    whatsapp: null,
    device_os: "demo",
    device_model: "demo",
    city: "Semarang",
    latitude: -6.9667,
    longitude: 110.4167,
    push_token: null,
    last_login: new Date().toISOString(),
  };
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) {
    if (error) console.warn("[GaulFM] fetchProfile:", error.message);
    return null;
  }
  const row = data as Record<string, unknown>;
  return {
    id: String(row.id ?? userId),
    full_name: (row.full_name as string) ?? null,
    email: (row.email as string) ?? null,
    whatsapp: ((row.whatsapp_number ?? row.whatsapp) as string) ?? null,
    device_os: (row.device_os as string) ?? null,
    device_model: (row.device_model as string) ?? null,
    city: ((row.location_city ?? row.city) as string) ?? null,
    latitude:
      typeof row.location_lat === "number"
        ? row.location_lat
        : typeof row.latitude === "number"
          ? row.latitude
          : null,
    longitude:
      typeof row.location_lng === "number"
        ? row.location_lng
        : typeof row.longitude === "number"
          ? row.longitude
          : null,
    push_token: (row.push_token as string) ?? null,
    last_login: (row.last_login as string) ?? null,
  };
}

async function updateLastLoginAndTracking(
  userId: string,
  isRegistration = false,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const updateData: Record<string, unknown> = {
    last_login: new Date().toISOString(),
  };

  const device = await getDeviceSummary();
  if (device.os) updateData.device_os = device.os;
  if (device.model) updateData.device_model = device.model;

  if (isRegistration) {
    const location = await captureLocationOnce();
    if (location.latitude != null) {
      updateData.location_lat = location.latitude;
    }
    if (location.longitude != null) {
      updateData.location_lng = location.longitude;
    }
    if (location.city) {
      updateData.location_city = location.city;
    }
  }

  const pushToken = await registerPushToken();
  if (pushToken) updateData.push_token = pushToken;

  const { error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", userId);
  if (error) console.warn("[GaulFM] tracking update:", error.message);
}

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  session: null,
  profile: null,
  initializing: true,

  restore: async () => {
    const supabase = getSupabase();
    if (!supabase) {
      try {
        const stored = await AsyncStorage.getItem("demo_auth");
        if (stored) {
          const { session, profile } = JSON.parse(stored);
          set({ session, profile });
        }
      } catch {
        // ignore JSON parse errors
      }
      set({ initializing: false });
      return;
    }
    try {
      const { data } = await supabase.auth.getSession();
      const session = data.session ?? null;
      set({ session, initializing: false });
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        set({ profile });
      }
      supabase.auth.onAuthStateChange(async (_event, nextSession) => {
        set({ session: nextSession });
        if (nextSession?.user) {
          const profile = await fetchProfile(nextSession.user.id);
          set({ profile });
        } else {
          set({ profile: null });
        }
      });
    } catch {
      await supabase.auth.signOut().catch(() => undefined);
      set({ session: null, profile: null, initializing: false });
    }
  },

  signIn: async (email, password) => {
    if (!isSupabaseConfigured) {
      const session = demoSession(email);
      const profile = demoProfile(email);
      set({ session, profile });
      AsyncStorage.setItem("demo_auth", JSON.stringify({ session, profile })).catch(() => {});
      return null;
    }
    const supabase = getSupabase();
    if (!supabase) return "Koneksi backend tidak tersedia";
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      return error.message.toLowerCase().includes("invalid")
        ? "Email atau password salah"
        : "Gagal masuk. Periksa koneksi kamu dan coba lagi.";
    }
    set({ session: data.session });
    if (data.user) {
      set({ profile: await fetchProfile(data.user.id) });
      void updateLastLoginAndTracking(data.user.id, false);
    }
    return null;
  },

  signUp: async ({ fullName, email, whatsapp, city, password }) => {
    if (!isSupabaseConfigured) {
      const profile = { ...demoProfile(email), full_name: fullName, whatsapp, city: city || "Semarang" };
      const session = demoSession(email);
      set({ session, profile });
      AsyncStorage.setItem("demo_auth", JSON.stringify({ session, profile })).catch(() => {});
      return null;
    }
    const supabase = getSupabase();
    if (!supabase) return "Koneksi backend tidak tersedia";
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, whatsapp, city } },
    });
    if (error) {
      return error.message.toLowerCase().includes("already")
        ? "Email sudah terdaftar. Coba masuk saja."
        : "Pendaftaran gagal. Periksa koneksi kamu dan coba lagi.";
    }
    if (!data.session && data.user) {
      return "PLEASE_CHECK_EMAIL";
    }
    set({ session: data.session });
    if (data.user) {
      const { error: upsertError } = await supabase.from("profiles").upsert({
        id: data.user.id,
        full_name: fullName,
        email,
        whatsapp_number: whatsapp,
        location_city: city,
        last_login: new Date().toISOString(),
      });
      if (upsertError) console.warn("[GaulFM] profile upsert:", upsertError.message);
      set({ profile: await fetchProfile(data.user.id) });
      void updateLastLoginAndTracking(data.user.id, true);
    }
    return null;
  },

  signOut: async () => {
    try {
      if (!isSupabaseConfigured) {
        await AsyncStorage.removeItem("demo_auth").catch(() => {});
      }
      const supabase = getSupabase();
      if (supabase && get().session) {
        await supabase.auth.signOut().catch(() => undefined);
      }
    } finally {
      set({ session: null, profile: null });
    }
  },

  setProfile: (profile) => set({ profile }),
}));
