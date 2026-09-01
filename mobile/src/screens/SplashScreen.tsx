import React from "react";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useThemeStore } from "../stores/themeStore";
import { BrandLogo } from "../components/ui/BrandLogo";

/**
 * In-app launch screen — dynamically supports lightmode & darkmode themes.
 * Rendered while the bootstrap in App.tsx is still running or gating is active.
 */
export function SplashScreen() {
  const mode = useThemeStore((s) => s.mode);
  const isDark = mode === "dark";

  return (
    <View className="flex-1 items-center justify-center bg-bg">
      <StatusBar style={isDark ? "light" : "dark"} animated />
      <BrandLogo size="lg" />
    </View>
  );
}


