import React from "react";
import { StatusBar, Text, View } from "react-native";
import { useThemeStore } from "../stores/themeStore";
import { BrandLogo } from "../components/ui/BrandLogo";

/**
 * In-app launch screen — dynamically supports lightmode & darkmode themes.
 * Shows centered brand logo and tagline with active theme background.
 */
export function SplashScreen() {
  const mode = useThemeStore((s) => s.mode);
  const colors = useThemeStore((s) => s.colors);
  const isDark = mode === "dark";

  return (
    <View
      className="flex-1 items-center justify-center"
      style={{ backgroundColor: colors.bg }}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.bg}
      />
      <View className="items-center justify-center">
        <BrandLogo size="lg" />
        <View className="mt-4 flex-row items-center gap-2">
          <View className="h-1.5 w-1.5 rounded-full bg-brand" />
          <Text
            className="text-xs font-semibold uppercase tracking-widest"
            style={{
              fontFamily: "PlusJakartaSans_600SemiBold",
              color: colors.textDim,
            }}
          >
            The Best Visual Radio Station • 87.8 FM
          </Text>
        </View>
      </View>
    </View>
  );
}



