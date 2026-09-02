import React from "react";
import { StatusBar, View } from "react-native";
import { useThemeStore } from "../stores/themeStore";
import { BrandLogo } from "../components/ui/BrandLogo";

/**
 * In-app launch screen — dynamically supports lightmode & darkmode themes.
 * Rendered while the bootstrap in App.tsx is still running or gating is active.
 */
export function SplashScreen() {
  const mode = useThemeStore((s) => s.mode);
  const colors = useThemeStore((s) => s.colors);
  const isDark = mode === "dark";

  return (
    <View
      className="flex-1 items-center justify-center bg-bg"
      style={{ backgroundColor: colors.bg }}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.bg}
      />
      <BrandLogo size="lg" />
    </View>
  );
}


