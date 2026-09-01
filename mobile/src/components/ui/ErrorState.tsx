import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStore } from "../../stores/themeStore";
import { Button } from "./Button";

interface ErrorStateProps {
  title?: string;
  message?: string;
  retryTitle?: string;
  onRetry?: () => void;
}

/** Network/data error placeholder with retry — live accent, not scary. */
export function ErrorState({
  title = "Ada kendala",
  message = "Tidak dapat memuat konten. Periksa koneksi kamu lalu coba lagi.",
  retryTitle = "Coba Lagi",
  onRetry,
}: ErrorStateProps) {
  const colors = useThemeStore((s) => s.colors);
  return (
    <View className="items-center px-6 py-14">
      <View className="h-16 w-16 items-center justify-center rounded-full border border-live/30 bg-live/10">
        <Ionicons name="cloud-offline-outline" size={30} color={colors.live} />
      </View>
      <Text className="mt-5 text-center text-lg font-bold text-text">{title}</Text>
      <Text className="mt-2 max-w-[280px] text-center text-sm leading-5 text-text-dim">
        {message}
      </Text>
      {onRetry ? (
        <Button
          title={retryTitle}
          onPress={onRetry}
          variant="secondary"
          className="mt-6"
        />
      ) : null}
    </View>
  );
}
