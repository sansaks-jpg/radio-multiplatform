import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNetInfo } from "@react-native-community/netinfo";
import { useThemeStore } from "../../stores/themeStore";

interface OfflineBannerProps {
  message?: string;
}

/** Compact non-blocking connectivity pill — orange/warn, not full-width alarm. */
export function OfflineBanner({
  message = "Mode offline — menampilkan konten tersimpan",
}: OfflineBannerProps) {
  const colors = useThemeStore((s) => s.colors);
  const netInfo = useNetInfo();
  if (netInfo.isConnected !== false) return null;

  return (
    <View className="mt-3 flex-row items-center justify-center gap-2 self-center rounded-full border border-orange/30 bg-orange/10 px-3.5 py-1.5">
      <Ionicons name="cloud-offline-outline" size={13} color={colors.orange} />
      <Text className="text-xs font-semibold text-orange">{message}</Text>
    </View>
  );
}
