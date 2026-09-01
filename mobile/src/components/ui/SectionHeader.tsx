import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStore } from "../../stores/themeStore";

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/**
 * Section title + optional "Lihat semua" action.
 * UX redesign: More visual weight — larger, bolder, with a subtle accent line.
 * Makes it clear "this is a new section" vs "this is just more content".
 */
export function SectionHeader({
  title,
  actionLabel,
  onAction,
  className = "",
}: SectionHeaderProps) {
  const colors = useThemeStore((s) => s.colors);
  return (
    <View className={`flex-row items-center justify-between ${className}`}>
      <View className="flex-row items-center gap-2">
        {/* Accent bar — visual anchor for section start */}
        <View className="h-4 w-1 rounded-full bg-brand" />
        <Text
          className="text-[15px] font-bold text-text"
          style={{ fontFamily: "PlusJakartaSans_700Bold" }}
        >
          {title}
        </Text>
      </View>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          hitSlop={8}
          className="flex-row items-center gap-1 py-1"
        >
          <Text
            className="text-xs font-bold uppercase tracking-wide text-brand"
            style={{ fontFamily: "PlusJakartaSans_700Bold" }}
          >
            {actionLabel}
          </Text>
          <Ionicons name="chevron-forward" size={12} color={colors.brand} />
        </Pressable>
      ) : null}
    </View>
  );
}
