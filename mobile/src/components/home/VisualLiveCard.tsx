import React, { forwardRef, useImperativeHandle, useState } from "react";
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
import { VisualPlayerSheet } from "./VisualPlayerSheet";

export interface VisualLiveCardHandle {
  /** Opens the in-app player if a video is available; returns false if none (caller should fall back). */
  openPlayer: () => boolean;
}

/**
 * Home "Visual Radio" — live embed in-app; "YouTube" action opens native app.
 */
export const VisualLiveCard = forwardRef<VisualLiveCardHandle>(function VisualLiveCard(
  _props,
  ref,
) {
  const colors = useThemeStore((s) => s.colors);
  const visual = useYouTubeVisual();
  const [playerOpen, setPlayerOpen] = useState(false);

  const data = visual.data ?? null;

  useImperativeHandle(
    ref,
    () => ({
      openPlayer: () => {
        if (!data) return false;
        setPlayerOpen(true);
        return true;
      },
    }),
    [data],
  );
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
    <View>
      {visual.isLoading && !data ? (
        <View className="h-32 items-center justify-center rounded-[24px] bg-surface border" style={{ borderColor: `${colors.line}40` }}>
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
          className="items-center rounded-[24px] bg-surface border px-4 py-6 active:opacity-85 shadow-sm"
          style={{ borderColor: `${colors.line}40` }}
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
          className="overflow-hidden rounded-[24px] bg-surface-3 active:opacity-95 shadow-md border"
          style={{ borderColor: `${colors.line}40` }}
        >
          {/* 16:9 Image Container */}
          <View className="w-full aspect-video bg-black relative">
            <Image
              source={{ uri: data.thumbnailUrl }}
              style={{ width: "100%", height: "100%", opacity: 0.9 }}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
            {/* Cinematic Gradients */}
            <View className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black/70 to-transparent" />
            <View className="absolute inset-x-0 bottom-0 h-[75%] bg-gradient-to-t from-black/95 via-black/40 to-transparent" />

            {/* Giant Glassmorphism Play Button */}
            <View className="absolute inset-0 items-center justify-center pointer-events-none">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-white/25 backdrop-blur-xl border border-white/40 shadow-2xl">
                <Ionicons name="play" size={32} color="#FFFFFF" style={{ marginLeft: 4 }} />
              </View>
            </View>

            {/* Top Badges */}
            <View className="absolute top-4 left-4 flex-row items-center gap-2">
              <View className="flex-row items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md px-3 py-1.5 border border-white/10">
                <Ionicons name="logo-youtube" size={14} color={isLive ? colors.live : "#FFFFFF"} />
                <Text
                  className="text-[10px] font-bold tracking-widest text-white uppercase"
                  style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                >
                  Visual Radio
                </Text>
              </View>
              {isLive ? (
                 <View className="flex-row items-center gap-1.5 rounded-full bg-live px-3 py-1.5 shadow-sm shadow-live/50">
                   <View className="h-1.5 w-1.5 rounded-full bg-white" />
                   <Text
                     className="text-[10px] font-extrabold tracking-widest text-white uppercase"
                     style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
                   >
                     Live
                   </Text>
                 </View>
              ) : isUpcoming ? (
                 <View className="flex-row items-center gap-1.5 rounded-full bg-orange px-3 py-1.5">
                   <Ionicons name="time" size={10} color="#FFFFFF" />
                   <Text
                     className="text-[10px] font-extrabold tracking-widest text-white uppercase"
                     style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
                   >
                     Segera
                   </Text>
                 </View>
              ) : null}
            </View>

            {/* Bottom Info */}
            <View className="absolute bottom-4 left-4 right-4">
              <Text
                className="text-[18px] font-extrabold leading-6 text-white shadow-sm"
                numberOfLines={2}
                style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
              >
                {data.title}
              </Text>
              <View className="mt-2 flex-row items-center justify-between">
                 <Text
                   className="text-[12px] font-medium text-white/80"
                   style={{ fontFamily: "PlusJakartaSans_500Medium" }}
                 >
                   {data.channelTitle}
                 </Text>
                 <View className="flex-row items-center gap-1 bg-white/15 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20">
                    <Text
                      className="text-[11px] font-bold text-white"
                      style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                    >
                      {isLive ? "Tonton Studio" : isUpcoming ? "Lihat Detail" : "Putar Video"}
                    </Text>
                    <Ionicons name="chevron-forward" size={12} color="#FFFFFF" />
                 </View>
              </View>
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
});
