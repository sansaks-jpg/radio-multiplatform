import { create } from "zustand";
import { Appearance, type ColorSchemeName } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colorScheme } from "nativewind";
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
  const current = system ?? Appearance.getColorScheme();
  return current === "dark" ? "dark" : "light";
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
  try {
    colorScheme.set(preference === "system" ? "system" : mode);
  } catch {
    // safe fallback in test / non-dom environments
  }
  return { mode, colors, glow: makeGlow(colors) };
}

const initialSystemScheme = Appearance.getColorScheme();
const initialPreference: ThemePreference = "system";

export const useThemeStore = create<ThemeState>((set, get) => ({
  preference: initialPreference,
  systemScheme: initialSystemScheme,
  ...applyResolved(initialPreference, initialSystemScheme),
  hydrated: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const preference: ThemePreference =
        raw === "light" || raw === "dark" || raw === "system"
          ? raw
          : "system";
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
    const currentSystem = Appearance.getColorScheme();
    set({
      preference,
      systemScheme: currentSystem,
      ...applyResolved(preference, currentSystem),
    });
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
