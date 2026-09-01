import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStore } from "../../stores/themeStore";
import { useYouTubeVisual } from "../../hooks/useYouTubeVisual";
import { openYouTube, type YouTubeVisual } from "../../services/youtube";
import { SectionHeader } from "../ui/SectionHeader";
import { VisualPlayerSheet } from "./VisualPlayerSheet";

/**
 * Home "Visual Radio" — live embed in-app; "YouTube" action opens native app.
 */
export function VisualLiveCard() {
  const colors = useThemeStore((s) => s.colors);
  const visual = useYouTubeVisual();
  const [playerOpen, setPlayerOpen] = useState(false);

  const data = visual.data ?? null;
  const isLive = data?.status === "live";
  const isUpcoming = data?.status === "upcoming";

  /** Prefer native YouTube app for channel / video. */
  const openNative = (item: YouTubeVisual | null) => {
    if (item?.videoId) {
      void openYouTube("video", item.videoId);
    } else {
      void openYouTube("channel");
    }
  };

  return (
    <View className="mt-8">
      <SectionHeader
        title="Visual radio"
        actionLabel="YouTube"
        onAction={() => openNative(data)}
      />

      {visual.isLoading && !data ? (
        <View className="mt-3 h-32 items-center justify-center rounded-2xl bg-surface">
          <ActivityIndicator color={colors.brand} />
          <Text
            className="mt-2 text-xs text-text-dim"
            style={{ fontFamily: "PlusJakartaSans_400Regular" }}
          >
            Memuat siaran visual…
          </Text>
        </View>
      ) : visual.isError && !data ? (
        <Pressable
          onPress={() => void visual.refetch()}
          className="mt-3 items-center rounded-2xl bg-surface px-4 py-6 active:opacity-85"
        >
          <Ionicons name="logo-youtube" size={28} color={colors.live} />
          <Text
            className="mt-2 text-sm font-bold text-text"
            style={{ fontFamily: "PlusJakartaSans_700Bold" }}
          >
            Gagal memuat visual
          </Text>
          <Text
            className="mt-1 text-center text-xs text-text-dim"
            style={{ fontFamily: "PlusJakartaSans_400Regular" }}
          >
            Ketuk untuk coba lagi, atau buka app YouTube
          </Text>
          <Pressable
            onPress={() => openNative(null)}
            className="mt-3 rounded-full bg-live/15 px-4 py-2"
          >
            <Text
              className="text-xs font-bold text-live"
              style={{ fontFamily: "PlusJakartaSans_700Bold" }}
            >
              Buka YouTube
            </Text>
          </Pressable>
        </Pressable>
      ) : data ? (
        <Pressable
          onPress={() => setPlayerOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={
            isLive
              ? `Tonton visual live: ${data.title}`
              : `Tonton visual: ${data.title}`
          }
          className="mt-3 flex-row overflow-hidden rounded-2xl bg-surface active:opacity-95"
        >
          <View className="relative h-28 w-32 shrink-0 bg-surface-3">
            <Image
              source={{ uri: data.thumbnailUrl }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
            <View className="absolute inset-0 items-center justify-center">
              <View className="h-9 w-9 items-center justify-center rounded-full bg-black/60">
                <Ionicons
                  name="play"
                  size={16}
                  color="#FFFFFF"
                  style={{ marginLeft: 2 }}
                />
              </View>
            </View>
            <View className="absolute left-1.5 bottom-1.5">
              {isLive ? (
                <View className="flex-row items-center gap-1 rounded-full bg-live px-1.5 py-0.5">
                  <View
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: "#FFFFFF",
                    }}
                  />
                  <Text
                    className="text-[8px] font-extrabold uppercase tracking-widest text-white"
                    style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
                  >
                    Live
                  </Text>
                </View>
              ) : isUpcoming ? (
                <View className="flex-row items-center gap-1 rounded-full bg-orange px-1.5 py-0.5">
                  <Ionicons name="time" size={8} color="#FFFFFF" />
                  <Text
                    className="text-[8px] font-extrabold uppercase tracking-widest text-white"
                    style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
                  >
                    Segera
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <View className="min-w-0 flex-1 justify-center px-3.5 py-2.5">
            <Text
              className="text-[9px] font-bold uppercase tracking-widest text-text-dim"
              style={{ fontFamily: "PlusJakartaSans_700Bold" }}
            >
              YouTube · {data.channelTitle}
            </Text>
            <Text
              className="mt-1 text-[13px] font-bold leading-4 text-text"
              numberOfLines={2}
              style={{ fontFamily: "PlusJakartaSans_700Bold" }}
            >
              {data.title}
            </Text>
            <View className="mt-2 flex-row items-center gap-1 self-start rounded-full bg-brand/15 px-2.5 py-1">
              <Text
                className="text-[10px] font-bold text-brand"
                style={{ fontFamily: "PlusJakartaSans_700Bold" }}
              >
                {isLive ? "Tonton" : isUpcoming ? "Detail" : "Putar"}
              </Text>
              <Ionicons name="chevron-forward" size={10} color={colors.brand} />
            </View>
          </View>
        </Pressable>
      ) : null}

      <VisualPlayerSheet
        visible={playerOpen}
        visual={data}
        onClose={() => setPlayerOpen(false)}
      />
    </View>
  );
}
