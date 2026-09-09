import React from "react";
import { FlatList, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStore } from "../../stores/themeStore";
import { usePlayerStore } from "../../stores/playerStore";
import { SectionHeader } from "../ui/SectionHeader";
import type { Announcer } from "../../types";

interface HomeAnnouncersProps {
  announcers: Announcer[];
}

/**
 * Gaul Squad — Deretan foto & profil 7 penyiar Gaul FM 87.8 Semarang.
 * Menampilkan avatar estetik & indikator Live jika penyiar sedang mengudara on-air.
 */
export function HomeAnnouncers({ announcers }: HomeAnnouncersProps) {
  const colors = useThemeStore((s) => s.colors);
  const nowPlaying = usePlayerStore((s) => s.nowPlaying);

  if (!announcers || announcers.length === 0) return null;

  return (
    <View className="mb-7">
      <SectionHeader
        title="Gaul Squad"
        actionLabel="87.8 FM"
      />

      <FlatList
        horizontal
        data={announcers}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 4, paddingVertical: 12, gap: 14 }}
        renderItem={({ item }) => {
          const isOnAir =
            nowPlaying.current_host &&
            nowPlaying.current_host.toLowerCase().includes(item.name.toLowerCase());

          return (
            <View className="items-center" style={{ width: 72 }}>
              <View
                className={`relative h-16 w-16 items-center justify-center rounded-full p-0.5 ${
                  isOnAir ? "bg-live shadow-md shadow-live/40" : "bg-line/40"
                }`}
              >
                <View className="h-full w-full overflow-hidden rounded-full bg-surface-3">
                  {item.photo_url ? (
                    <Image
                      source={{ uri: item.photo_url }}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="cover"
                      transition={200}
                    />
                  ) : (
                    <View className="h-full w-full items-center justify-center">
                      <Ionicons name="mic" size={20} color={colors.brand} />
                    </View>
                  )}
                </View>

                {isOnAir && (
                  <View className="absolute -bottom-1 rounded-full bg-live px-1.5 py-0.5 shadow-sm">
                    <Text
                      className="text-[8px] font-extrabold uppercase text-white"
                      style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
                    >
                      LIVE
                    </Text>
                  </View>
                )}
              </View>

              <Text
                className="mt-2 text-center text-xs font-bold text-text"
                numberOfLines={1}
                style={{ fontFamily: "PlusJakartaSans_700Bold" }}
              >
                {item.name}
              </Text>
              <Text
                className="text-center text-[10px] text-text-dim"
                numberOfLines={1}
                style={{ fontFamily: "PlusJakartaSans_500Medium" }}
              >
                {item.nickname || "Penyiar"}
              </Text>
            </View>
          );
        }}
      />
    </View>
  );
}
