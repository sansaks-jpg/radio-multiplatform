"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Studio theme system — dark is the default ("console" feel matching the
 * mobile app's Gaul Neon Night brand), with a calmer light mode available
 * via the toggle in the sidebar footer.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
