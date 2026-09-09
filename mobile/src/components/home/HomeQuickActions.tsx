import React from "react";
import { Pressable, Text, View } from "react-native";
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
    <View className="flex-row justify-between px-2 py-2">
      {actions.map((action) => {
        const tint = colorFor(action.colorKey);
        return (
          <Pressable
            key={action.key}
            onPress={action.onPress}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            className="items-center gap-2 active:opacity-75"
          >
            <View
              className="h-14 w-14 items-center justify-center rounded-full bg-surface border shadow-sm"
              style={{ borderColor: `${colors.line}60` }}
            >
              <Ionicons name={action.icon} size={24} color={tint} />
            </View>
            <Text
              className="text-[12px] font-bold text-text"
              numberOfLines={1}
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
