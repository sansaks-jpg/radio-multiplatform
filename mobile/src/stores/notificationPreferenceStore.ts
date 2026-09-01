import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * App-level notification preference (program reminders + push registration).
 * Callers: AppSettingsScreen, notifications.ts, ThemeRoot hydrate.
 * API: enabled, hydrate(), setEnabled(boolean).
 * Schema: AsyncStorage key @gaulfm/notifications-enabled ("1"|"0").
 * User: "sekalian implementasikan notifikasi" on app settings.
 */
const STORAGE_KEY = "@gaulfm/notifications-enabled";

interface NotificationPreferenceState {
  enabled: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setEnabled: (enabled: boolean) => Promise<void>;
}

export const useNotificationPreferenceStore =
  create<NotificationPreferenceState>((set) => ({
    enabled: true,
    hydrated: false,

    hydrate: async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const enabled = raw !== "0";
        set({ enabled, hydrated: true });
      } catch {
        set({ hydrated: true });
      }
    },

    setEnabled: async (enabled) => {
      set({ enabled });
      try {
        await AsyncStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
      } catch {
        // Non-fatal.
      }
    },
  }));
