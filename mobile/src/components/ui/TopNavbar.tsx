import React, { useCallback, useMemo, useState } from "react";
import { Pressable, View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, type NavigationProp } from "@react-navigation/native";
import { useAuthStore } from "../../stores/authStore";
import { useThemeStore } from "../../stores/themeStore";
import type { MainTabParamList } from "../../types";
import { BrandLogo } from "./BrandLogo";

function initials(name: string | null | undefined): string {
  if (!name) return "GF";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

interface TopNavbarProps {
  className?: string;
}

/**
 * Shared top bar — app logo + profile initials.
 * Used on Home, Jadwal, and Berita. Avatar opens Profile tab.
 */
export function TopNavbar({ className = "" }: TopNavbarProps) {
  const colors = useThemeStore((s) => s.colors);
  const profile = useAuthStore((s) => s.profile);
  const navigation = useNavigation<NavigationProp<MainTabParamList>>();

  const goToProfile = useCallback(() => {
    navigation.navigate("Profile");
  }, [navigation]);

  const label = profile?.full_name?.trim() || "Profil";

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
        className="h-10 w-10 overflow-hidden rounded-full bg-brand/20 items-center justify-center active:opacity-80 border-2 border-surface"
      >
        <Text
          className="text-[14px] font-extrabold text-brand"
          style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
        >
          {initials(profile?.full_name)}
        </Text>
      </Pressable>
    </View>
  );
}
