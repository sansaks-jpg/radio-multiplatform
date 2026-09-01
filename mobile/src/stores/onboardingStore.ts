import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "gaulfm_onboarding_seen_v1";

interface OnboardingStoreState {
  /** True once the splash/auth restore has resolved the onboarding flag. */
  hydrated: boolean;
  /** True after the user has finished (or skipped) onboarding at least once. */
  hasSeenOnboarding: boolean;
  /** Read the persisted flag from AsyncStorage at app start. */
  hydrate: () => Promise<void>;
  /** Persist the "seen" flag and mark onboarding as complete. */
  complete: () => Promise<void>;
}

/**
 * First-run onboarding gate (plan §1 — pre-auth flow).
 * Persisted in AsyncStorage so the onboarding carousel only appears once
 * per install; subsequent launches go straight to the auth stack.
 */
export const useOnboardingStore = create<OnboardingStoreState>((set) => ({
  hydrated: false,
  hasSeenOnboarding: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      set({ hasSeenOnboarding: raw === "1", hydrated: true });
    } catch (err) {
      console.warn("[GaulFM] onboarding hydrate:", err);
      set({ hasSeenOnboarding: false, hydrated: true });
    }
  },

  complete: async () => {
    set({ hasSeenOnboarding: true });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, "1");
    } catch (err) {
      console.warn("[GaulFM] onboarding complete:", err);
    }
  },
}));
