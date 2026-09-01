"use client";

/**
 * ThemeProvider — Sonic Pulse is dark-first, so we don't need next-themes
 * (which injects an inline <script> that Next.js 16/React 19.2 warns about).
 * The root <html> already has className="dark" for a static dark theme.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
