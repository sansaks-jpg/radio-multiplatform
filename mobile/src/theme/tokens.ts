/**
 * Sonic Pulse tokens — mobile/DESIGN.md.
 * Dark: high-energy studio (true black + bright green/orange).
 * Light: clean paper surfaces + deep brand green for contrast.
 *
 * CSS channel vars power NativeWind (see tailwind.config.js + useThemeVars).
 * Keep glow only on primary Play / main CTA.
 */

export type ThemeMode = "light" | "dark";

/** RGB channel triples for NativeWind `rgb(var(--x) / <alpha>)`. */
export type ColorChannels = {
  bg: string;
  surface: string;
  surface2: string;
  surface3: string;
  line: string;
  text: string;
  textDim: string;
  brand: string;
  brandDeep: string;
  onBrand: string;
  orange: string;
  live: string;
  success: string;
};

/** Hex palette used by icons, StatusBar, glow, non-class styles. */
export type ColorPalette = {
  bg: string;
  surface: string;
  surface2: string;
  surface3: string;
  line: string;
  text: string;
  textDim: string;
  brand: string;
  brandDeep: string;
  onBrand: string;
  orange: string;
  live: string;
  success: string;
};

/** Dark — DESIGN elevation #050505 + punchy accents (not muddy greys). */
export const darkColors: ColorPalette = {
  bg: "#050505",
  surface: "#121417",
  surface2: "#1E2023",
  surface3: "#2A2D31",
  line: "#4A554C",
  text: "#F2F4F3",
  textDim: "#A8B8AB",
  /** primary-fixed — brighter Gaul Green */
  brand: "#94F8AE",
  brandDeep: "#007A3E",
  onBrand: "#00210C",
  /** secondary-container — saturated On-Air orange */
  orange: "#FF9A3D",
  live: "#FF3B30",
  success: "#94F8AE",
};

export const darkChannels: ColorChannels = {
  bg: "5 5 5",
  surface: "18 20 23",
  surface2: "30 32 35",
  surface3: "42 45 49",
  line: "74 85 76",
  text: "242 244 243",
  textDim: "168 184 171",
  brand: "148 248 174",
  brandDeep: "0 122 62",
  onBrand: "0 33 12",
  orange: "255 154 61",
  live: "255 59 48",
  success: "148 248 174",
};

/** Light — paper UI, deep green brand for readability. */
export const lightColors: ColorPalette = {
  bg: "#F3F6F4",
  surface: "#FFFFFF",
  surface2: "#E8EEEA",
  surface3: "#DCE5DF",
  line: "#B4C2B8",
  text: "#111316",
  textDim: "#4E5C52",
  brand: "#007A3E",
  brandDeep: "#005228",
  onBrand: "#FFFFFF",
  orange: "#DC7521",
  live: "#D60100",
  success: "#007A3E",
};

export const lightChannels: ColorChannels = {
  bg: "243 246 244",
  surface: "255 255 255",
  surface2: "232 238 234",
  surface3: "220 229 223",
  line: "180 194 184",
  text: "17 19 22",
  textDim: "78 92 82",
  brand: "0 122 62",
  brandDeep: "0 82 40",
  onBrand: "255 255 255",
  orange: "220 117 33",
  live: "214 1 0",
  success: "0 122 62",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
  "2xl": 40,
} as const;

export function makeGlow(palette: ColorPalette) {
  return {
    brand: {
      shadowColor: palette.brand,
      shadowOpacity: 0.4,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 0 },
      elevation: 8,
    },
    orange: {
      shadowColor: palette.orange,
      shadowOpacity: 0.45,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 0 },
      elevation: 8,
    },
  } as const;
}

export const dock = {
  marginX: 12,
  miniHeight: 64,
  tabBarHeight: 56,
  contentPadTabs: 88,
  contentPadWithMini: 160,
} as const;

export function channelsToVars(ch: ColorChannels): Record<string, string> {
  return {
    "--color-bg": ch.bg,
    "--color-surface": ch.surface,
    "--color-surface-2": ch.surface2,
    "--color-surface-3": ch.surface3,
    "--color-line": ch.line,
    "--color-text": ch.text,
    "--color-text-dim": ch.textDim,
    "--color-brand": ch.brand,
    "--color-brand-deep": ch.brandDeep,
    "--color-onbrand": ch.onBrand,
    "--color-orange": ch.orange,
    "--color-live": ch.live,
    "--color-success": ch.success,
  };
}
