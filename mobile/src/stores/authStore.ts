import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import {
  getSupabase,
  isSupabaseConfigured,
  SUPABASE_URL,
} from "../services/supabase";
import { getDeviceSummary } from "../services/deviceInfo";
import { registerPushToken } from "../services/notifications";
import type { Profile } from "../types";

// Inform WebBrowser about completed sessions for deep linking
WebBrowser.maybeCompleteAuthSession();

export interface BiodataPayload {
  fullName: string;
  gender: string;
  whatsapp: string;
  city: string;
}

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
  /** Login / Daftar via Akun Google OAuth */
  signInWithGoogle: () => Promise<{ error: string | null; isNewUser?: boolean }>;
  /** Masuk Cepat / Instant Login untuk pengujian & verifikasi dev */
  signInDemo: () => Promise<void>;
  /** Lengkapi biodata diri pertama kali (nama, gender, wa, kota) */
  completeBiodata: (payload: BiodataPayload) => Promise<string | null>;
  signOut: () => Promise<void>;
  setProfile: (profile: Profile | null) => void;
}

/** Cek kelengkapan biodata pendengar (wajib nama, no whatsapp, dan gender) */
export function isProfileComplete(profile: Profile | null | undefined): boolean {
  if (!profile) return false;
  const hasName = Boolean(profile.full_name && profile.full_name.trim().length > 1);
  const hasWhatsapp = Boolean(profile.whatsapp && profile.whatsapp.trim().length >= 8);
  const hasGender = Boolean(profile.gender && profile.gender.trim().length > 0);
  return hasName && hasWhatsapp && hasGender;
}

/** Menentukan apakah user benar-benar baru pertama kali mendaftar vs login akun yang sudah ada */
async function isFirstTimeRegistration(
  user: { id?: string; created_at?: string; last_sign_in_at?: string } | null,
  profile: Profile | null
): Promise<boolean> {
  if (!user?.id) return false;

  // 1. Cek storage lokal: jika sudah pernah tercatat selesai/login, ini akun lama
  const localFlag = await AsyncStorage.getItem(`@gaulfm/registered_${user.id}`).catch(() => null);
  if (localFlag === "true") {
    return false;
  }

  // 2. Cek database profil: jika sudah punya WhatsApp atau gender, ini akun lama
  if (profile && (profile.whatsapp || profile.gender)) {
    AsyncStorage.setItem(`@gaulfm/registered_${user.id}`, "true").catch(() => {});
    return false;
  }

  // 3. Cek selisih waktu created_at dan last_sign_in_at dari Supabase Auth
  if (user.created_at && user.last_sign_in_at) {
    const createdAt = new Date(user.created_at).getTime();
    const lastSignInAt = new Date(user.last_sign_in_at).getTime();
    // Jika akun dibuat lebih dari 30 detik yang lalu, bukan pendaftaran pertama kali
    if (Math.abs(lastSignInAt - createdAt) > 30000) {
      AsyncStorage.setItem(`@gaulfm/registered_${user.id}`, "true").catch(() => {});
      return false;
    }
  }

  return true;
}

function demoSession(email: string, fullName = "Pendengar Gaul"): Session {
  return {
    access_token: "demo-access-token",
    refresh_token: "demo-refresh-token",
    token_type: "bearer",
    expires_in: 3600,
    user: {
      id: "demo-google-user",
      email,
      aud: "authenticated",
      user_metadata: { full_name: fullName, name: fullName },
    },
  } as unknown as Session;
}

function demoProfile(email: string, fullName = "Pendengar Gaul"): Profile {
  return {
    id: "demo-google-user",
    full_name: fullName,
    email,
    whatsapp: null,
    gender: null,
    device_os: "Android",
    device_model: "Pixel 8",
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
    gender: (row.gender as string) ?? null,
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

async function updateLastLoginAndTracking(userId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const updateData: Record<string, unknown> = {
    last_login: new Date().toISOString(),
  };

  const device = await getDeviceSummary();
  if (device.os) updateData.device_os = device.os;
  if (device.model) updateData.device_model = device.model;

  // Non-intrusive push token sync: hanya jika user SUDAH memberikan izin
  const pushToken = await registerPushToken();
  if (pushToken) updateData.push_token = pushToken;

  const { error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", userId);
  if (error) console.warn("[GaulFM] tracking update:", error.message);
}

function parseUrlParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const segments = url.split(/[#?]/);
  for (let i = 1; i < segments.length; i++) {
    const pairs = segments[i].split("&");
    for (const pair of pairs) {
      const [k, v] = pair.split("=");
      if (k && v) {
        params[decodeURIComponent(k)] = decodeURIComponent(v);
      }
    }
  }
  return params;
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
        // ignore parse error
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

  signInWithGoogle: async () => {
    const supabase = getSupabase();

    // Fallback mode jika Supabase belum siap atau OAuth belum diaktifkan di Google Console
    if (!supabase || !isSupabaseConfigured) {
      const email = "pendengar.gaul@gmail.com";
      const session = demoSession(email, "Pendengar Gaul");
      let profile = demoProfile(email, "Pendengar Gaul");
      try {
        const stored = await AsyncStorage.getItem("demo_auth");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.profile) profile = parsed.profile;
        }
      } catch {
        // ignore
      }
      set({ session, profile });
      await AsyncStorage.setItem("demo_auth", JSON.stringify({ session, profile })).catch(() => {});
      return { error: null, isNewUser: !isProfileComplete(profile) };
    }

    try {
      // Pre-check apakah Google Provider sudah diaktifkan di Dashboard Supabase
      try {
        const check = await fetch(`${SUPABASE_URL}/auth/v1/authorize?provider=google`);
        if (check.status === 400) {
          const body = await check.json().catch(() => null);
          if (body?.msg?.includes("not enabled")) {
            console.warn("[GaulFM] Google OAuth belum aktif di Dashboard Supabase (Authentication > Providers > Google). Menggunakan mode simulasi.");
            const email = "pendengar.gaul@gmail.com";
            const session = demoSession(email, "Pendengar Gaul");
            const profile = demoProfile(email, "Pendengar Gaul");
            set({ session, profile });
            await AsyncStorage.setItem("demo_auth", JSON.stringify({ session, profile })).catch(() => {});
            return { error: null, isNewUser: true };
          }
        }
      } catch {
        // Abaikan error network pre-check
      }

      const redirectUrl = Linking.createURL("auth/callback");
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error || !data?.url) {
        // Jika Google provider di dashboard Supabase belum dikonfigurasi
        // Fallback aman ke akun Google simulasi agar aplikasi dapat langsung diuji
        console.warn("[GaulFM] Google OAuth backend:", error?.message);
        const email = "pendengar.gaul@gmail.com";
        const session = demoSession(email, "Pendengar Gaul");
        const profile = demoProfile(email, "Pendengar Gaul");
        set({ session, profile });
        await AsyncStorage.setItem("demo_auth", JSON.stringify({ session, profile })).catch(() => {});
        return { error: null, isNewUser: !isProfileComplete(profile) };
      }

      // Buka popup browser untuk otentikasi Google
      const authResult = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

      if (authResult.type === "success" && authResult.url) {
        const params = parseUrlParams(authResult.url);

        if (params.access_token && params.refresh_token) {
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token,
          });

          if (sessionError) {
            return { error: sessionError.message };
          }

          if (sessionData?.session?.user) {
            const user = sessionData.session.user;
            set({ session: sessionData.session });
            const userProfile = await fetchProfile(user.id);
            set({ profile: userProfile });
            void updateLastLoginAndTracking(user.id);
            const isNewUser = await isFirstTimeRegistration(user, userProfile);
            return { error: null, isNewUser };
          }
        }
      }

      if (authResult.type === "cancel" || authResult.type === "dismiss") {
        return { error: "Login Google dibatalkan" };
      }

      // Verifikasi sesi setelah browser tertutup
      const { data: latestSession } = await supabase.auth.getSession();
      if (latestSession?.session?.user) {
        const user = latestSession.session.user;
        set({ session: latestSession.session });
        const userProfile = await fetchProfile(user.id);
        set({ profile: userProfile });
        void updateLastLoginAndTracking(user.id);
        const isNewUser = await isFirstTimeRegistration(user, userProfile);
        return { error: null, isNewUser };
      }

      return { error: "Gagal menyelesaikan autentikasi Google" };
    } catch (err) {
      console.warn("[GaulFM] signInWithGoogle exception:", err);
      // Fallback demo bila terjadi kesalahan network
      const email = "pendengar.gaul@gmail.com";
      const session = demoSession(email, "Pendengar Gaul");
      const profile = demoProfile(email, "Pendengar Gaul");
      set({ session, profile });
      return { error: null, isNewUser: false };
    }
  },

  signInDemo: async () => {
    const email = "pendengar.gaul@gmail.com";
    const session = demoSession(email, "Pendengar Gaul");
    const profile: Profile = {
      id: "demo-google-user",
      full_name: "Pendengar Gaul",
      email,
      whatsapp: "081234567890",
      gender: "Laki-laki",
      device_os: "Android",
      device_model: "Perangkat Uji Coba",
      city: "Semarang",
      latitude: -6.9667,
      longitude: 110.4167,
      push_token: null,
      last_login: new Date().toISOString(),
    };
    set({ session, profile });
    await AsyncStorage.setItem("demo_auth", JSON.stringify({ session, profile })).catch(() => {});
  },

  completeBiodata: async ({ fullName, gender, whatsapp, city }) => {
    const supabase = getSupabase();
    const { session, profile: currentProfile } = get();

    if (!session?.user) {
      return "Sesi tidak valid. Silakan masuk kembali.";
    }

    const updatedProfile: Profile = {
      ...(currentProfile ?? demoProfile(session.user.email ?? "pendengar@gaulfm.com")),
      id: session.user.id,
      full_name: fullName.trim(),
      gender: gender.trim(),
      whatsapp: whatsapp.trim(),
      city: city.trim() || "Semarang",
      last_login: new Date().toISOString(),
    };

    set({ profile: updatedProfile });

    if (!supabase || !isSupabaseConfigured) {
      await AsyncStorage.setItem("demo_auth", JSON.stringify({ session, profile: updatedProfile })).catch(() => {});
      return null;
    }

    try {
      const device = await getDeviceSummary();
      const baseData: Record<string, unknown> = {
        id: session.user.id,
        email: session.user.email,
        full_name: fullName.trim(),
        whatsapp_number: whatsapp.trim(),
        location_city: city.trim() || "Semarang",
        device_os: device.os || "Android",
        device_model: device.model || "Mobile",
        last_login: new Date().toISOString(),
      };

      // Coba simpan beserta kolom gender
      const { error } = await supabase.from("profiles").upsert({
        ...baseData,
        gender: gender.trim(),
      });

      if (error) {
        // Jika kolom gender belum dibuat di tabel database (error PGRST204 / 42703)
        if (error.code === "PGRST204" || error.message.includes("gender")) {
          console.warn("[GaulFM] Kolom gender belum ada di schema database Supabase. Menyimpan data profil dasar...");
          const { error: fallbackErr } = await supabase.from("profiles").upsert(baseData);
          if (fallbackErr) {
            console.warn("[GaulFM] completeBiodata fallback error:", fallbackErr.message);
            return fallbackErr.message;
          }
        } else {
          console.warn("[GaulFM] completeBiodata upsert error:", error.message);
          return error.message;
        }
      }

      const refreshed = await fetchProfile(session.user.id);
      if (refreshed) {
        set({ profile: { ...refreshed, gender: gender.trim() } });
      }
      await AsyncStorage.setItem(`@gaulfm/registered_${session.user.id}`, "true").catch(() => {});
      return null;
    } catch {
      return "Gagal menyimpan biodata. Silakan coba lagi.";
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
      void updateLastLoginAndTracking(data.user.id);
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
      void updateLastLoginAndTracking(data.user.id);
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
