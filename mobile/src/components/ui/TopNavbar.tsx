import React, { useCallback, useMemo } from "react";
import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { useNavigation, type NavigationProp } from "@react-navigation/native";
import { useAuthStore } from "../../stores/authStore";
import { useThemeStore } from "../../stores/themeStore";
import type { MainTabParamList } from "../../types";
import { BrandLogo } from "./BrandLogo";

/** Dicebear thumbs avatar — pure photo circle, no border (matches live chat). */
function profileAvatarUrl(
  seed: string,
  isDark: boolean,
): string {
  const bg = isDark ? "0a0f0b" : "e8eeea";
  const shape = isDark ? "94f8ae" : "007a3e";
  return `https://api.dicebear.com/9.x/thumbs/png?seed=${encodeURIComponent(seed)}&backgroundColor=${bg}&shapeColor=${shape}`;
}

interface TopNavbarProps {
  className?: string;
}

/**
 * Shared top bar — app logo + profile photo avatar (no border).
 * Used on Home, Jadwal, and Berita. Avatar opens Profile tab.
 */
export function TopNavbar({ className = "" }: TopNavbarProps) {
  const mode = useThemeStore((s) => s.mode);
  const profile = useAuthStore((s) => s.profile);
  const navigation = useNavigation<NavigationProp<MainTabParamList>>();

  const goToProfile = useCallback(() => {
    navigation.navigate("Profile");
  }, [navigation]);

  const label = profile?.full_name?.trim() || "Profil";
  const isDark = mode === "dark";
  const seed = profile?.id || profile?.email || profile?.full_name || "gaul";
  const uri = useMemo(
    () => profileAvatarUrl(seed, isDark),
    [seed, isDark],
  );

  return (
    <View
      className={`flex-row items-center justify-between ${className}`}
      accessibilityRole="header"
    >
      <BrandLogo size="sm" />

      <Pressable
        onPress={goToProfile}
        accessibilityRole="button"
        accessibilityLabel={`Buka profil, ${label}`}
        hitSlop={8}
        className="h-10 w-10 overflow-hidden rounded-full active:opacity-80"
      >
        <Image
          source={{ uri }}
          style={{ width: 40, height: 40 }}
          contentFit="cover"
          transition={150}
          cachePolicy="memory-disk"
        />
      </Pressable>
    </View>
  );
}
