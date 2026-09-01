import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStore } from "../../stores/themeStore";
import { Button } from "./Button";

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionTitle?: string;
  onAction?: () => void;
}

/** Empty-list placeholder — brand-tinted icon well, calm hierarchy. */
export function EmptyState({
  icon = "albums-outline",
  title,
  message,
  actionTitle,
  onAction,
}: EmptyStateProps) {
  const colors = useThemeStore((s) => s.colors);
  return (
    <View className="items-center px-6 py-14">
      <View className="h-16 w-16 items-center justify-center rounded-full border border-line/50 bg-surface-2">
        <Ionicons name={icon} size={30} color={colors.brand} />
      </View>
      <Text className="mt-5 text-center text-lg font-bold text-text">{title}</Text>
      {message ? (
        <Text className="mt-2 max-w-[280px] text-center text-sm leading-5 text-text-dim">
          {message}
        </Text>
      ) : null}
      {actionTitle && onAction ? (
        <Button
          title={actionTitle}
          onPress={onAction}
          variant="secondary"
          className="mt-6"
        />
      ) : null}
    </View>
  );
}
