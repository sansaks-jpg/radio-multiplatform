import { create } from "zustand";
import { Appearance, type ColorSchemeName } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  darkChannels,
  darkColors,
  lightChannels,
  lightColors,
  makeGlow,
  type ColorPalette,
  type ThemeMode,
} from "../theme/tokens";

const STORAGE_KEY = "@gaulfm/theme-preference";

export type ThemePreference = "system" | "light" | "dark";

function resolveMode(
  preference: ThemePreference,
  system: ColorSchemeName,
): ThemeMode {
  if (preference === "light") return "light";
  if (preference === "dark") return "dark";
  return system === "light" ? "light" : "dark";
}

function paletteFor(mode: ThemeMode): ColorPalette {
  return mode === "light" ? lightColors : darkColors;
}

interface ThemeState {
  /** User choice — system follows device. */
  preference: ThemePreference;
  /** Last known system scheme. */
  systemScheme: ColorSchemeName;
  /** Resolved light | dark. */
  mode: ThemeMode;
  colors: ColorPalette;
  glow: ReturnType<typeof makeGlow>;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setPreference: (preference: ThemePreference) => void;
  setSystemScheme: (scheme: ColorSchemeName) => void;
  toggleLightDark: () => void;
}

function applyResolved(
  preference: ThemePreference,
  systemScheme: ColorSchemeName,
) {
  const mode = resolveMode(preference, systemScheme);
  const colors = paletteFor(mode);
  return { mode, colors, glow: makeGlow(colors) };
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  preference: "light",
  systemScheme: Appearance.getColorScheme(),
  ...applyResolved("light", Appearance.getColorScheme()),
  hydrated: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const preference: ThemePreference =
        raw === "light" || raw === "dark" || raw === "system"
          ? raw
          : "light";
      const systemScheme = Appearance.getColorScheme();
      set({
        preference,
        systemScheme,
        ...applyResolved(preference, systemScheme),
        hydrated: true,
      });
    } catch {
      set({ hydrated: true });
    }
  },

  setPreference: (preference) => {
    const { systemScheme } = get();
    set({ preference, ...applyResolved(preference, systemScheme) });
    void AsyncStorage.setItem(STORAGE_KEY, preference);
  },

  setSystemScheme: (systemScheme) => {
    const { preference } = get();
    set({ systemScheme, ...applyResolved(preference, systemScheme) });
  },

  toggleLightDark: () => {
    const next: ThemePreference = get().mode === "dark" ? "light" : "dark";
    get().setPreference(next);
  },
}));

export function getThemeChannels(mode: ThemeMode) {
  return mode === "light" ? lightChannels : darkChannels;
}
