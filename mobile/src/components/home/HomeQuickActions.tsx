import React from "react";
import { Text, View } from "react-native";
import { MotionPressable as Pressable } from "../ui/MotionPressable";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStore } from "../../stores/themeStore";

export interface QuickAction {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  colorKey: "brand" | "orange" | "live";
  onPress: () => void;
}

interface HomeQuickActionsProps {
  actions: QuickAction[];
}

/**
 * Beranda quick-actions — 4 pintasan paling sering dibutuhkan pendengar:
 * Jadwal, Live chat, Visual radio, Berita. Satu ketuk, tanpa scroll jauh.
 */
export function HomeQuickActions({ actions }: HomeQuickActionsProps) {
  const colors = useThemeStore((s) => s.colors);

  const colorFor = (key: QuickAction["colorKey"]) =>
    key === "brand" ? colors.brand : key === "orange" ? colors.orange : colors.live;

  return (
    <View className="flex-row justify-between py-1">
      {actions.map((action) => {
        const tint = colorFor(action.colorKey);
        return (
          <Pressable
            key={action.key}
            onPress={action.onPress}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            className="flex-1 items-center gap-1.5 active:opacity-75"
          >
            <View
              className="h-12 w-12 items-center justify-center rounded-full border bg-surface shadow-sm"
              style={{ borderColor: `${colors.line}60` }}
            >
              <Ionicons name={action.icon} size={21} color={tint} />
            </View>
            <Text
              className="text-center text-[11px] font-bold text-text"
              numberOfLines={2}
              style={{ fontFamily: "PlusJakartaSans_700Bold" }}
            >
              {action.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
