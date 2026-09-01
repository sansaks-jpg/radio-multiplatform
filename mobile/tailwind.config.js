/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.tsx", "./index.ts", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Channel vars — set at root via nativewind vars() (themeStore)
        bg: "rgb(var(--color-bg) / <alpha-value>)",
        surface: {
          DEFAULT: "rgb(var(--color-surface) / <alpha-value>)",
          2: "rgb(var(--color-surface-2) / <alpha-value>)",
          3: "rgb(var(--color-surface-3) / <alpha-value>)",
        },
        line: "rgb(var(--color-line) / <alpha-value>)",
        text: {
          DEFAULT: "rgb(var(--color-text) / <alpha-value>)",
          dim: "rgb(var(--color-text-dim) / <alpha-value>)",
        },
        brand: {
          DEFAULT: "rgb(var(--color-brand) / <alpha-value>)",
          deep: "rgb(var(--color-brand-deep) / <alpha-value>)",
        },
        onbrand: "rgb(var(--color-onbrand) / <alpha-value>)",
        orange: "rgb(var(--color-orange) / <alpha-value>)",
        live: "rgb(var(--color-live) / <alpha-value>)",
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        card: "16px",
        lg: "24px",
      },
      fontFamily: {
        sans: ["PlusJakartaSans_400Regular"],
        medium: ["PlusJakartaSans_500Medium"],
        semibold: ["PlusJakartaSans_600SemiBold"],
        bold: ["PlusJakartaSans_700Bold"],
        extrabold: ["PlusJakartaSans_800ExtraBold"],
      },
      spacing: {
        4.5: "18px",
      },
    },
  },
  plugins: [],
};
