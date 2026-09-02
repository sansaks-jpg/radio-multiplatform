import React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStore } from "../../stores/themeStore";
import { usePlayerStore } from "../../stores/playerStore";
import { usePlayerControls } from "../../hooks/usePlayerControls";
import { useIcecastStats } from "../../hooks/useIcecastStats";
import type { Program } from "../../types";

interface HomeHeroProps {
  matchedProgram?: Program | null;
  onOpenDetail: () => void;
}

/**
 * Dashboard hero — immersive now-playing card (DESIGN.md Sonic Pulse).
 * Full-bleed cover art, pulsing LIVE chip, listener count, glowing play CTA.
 * Tap artwork/text → live chat sheet; play button toggles stream.
 *
 * UX redesign: Play button at bottom-right (thumb zone), not center.
 * Better visual hierarchy: status chips top, info bottom-left, CTA bottom-right.
 * Distinct off-air state when stream is not healthy.
 */
export function HomeHero({ matchedProgram = null, onOpenDetail }: HomeHeroProps) {
  const colors = useThemeStore((s) => s.colors);
  const glow = useThemeStore((s) => s.glow);
  const status = usePlayerStore((s) => s.status);
  const nowPlaying = usePlayerStore((s) => s.nowPlaying);
  const { toggle } = usePlayerControls();
  const { stats } = useIcecastStats();

  const playing = status === "playing";
  const buffering = status === "buffering";
  const streamHealthy = playing || buffering;
  const hasError = status === "error";

  const title = matchedProgram?.name ?? nowPlaying.current_program;
  const host = matchedProgram?.host ?? nowPlaying.current_host;
  const cover = matchedProgram?.cover_url ?? nowPlaying.current_cover_url ?? null;
  const listeners = stats.isLive ? stats.listeners.toLocaleString("id-ID") : null;
  const timeRange = matchedProgram
    ? `${matchedProgram.start_time}–${matchedProgram.end_time} WIB`
    : null;

  return (
    <View className="overflow-hidden rounded-2xl bg-surface">
      {/* Artwork zone — pressable for detail */}
      <Pressable
        onPress={onOpenDetail}
        accessibilityRole="button"
        accessibilityLabel={`Buka live chat: ${title}`}
        className="active:opacity-95"
      >
        <View className="h-64 w-full bg-surface-3">
          {cover ? (
            <Image
              source={{ uri: cover }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              transition={280}
            />
          ) : (
            <View className="h-full w-full items-center justify-center">
              <View className="h-24 w-24 items-center justify-center rounded-full bg-brand/15">
                <Ionicons name="radio" size={48} color={colors.brand} />
              </View>
            </View>
          )}

          {/* Gradient scrim */}
          <View className="absolute inset-x-0 bottom-0 h-2/5 bg-black/55" />

          {/* Top row — LIVE badge + listeners + chat hint */}
          <View className="absolute left-4 right-4 top-4 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View
                className={`flex-row items-center gap-1.5 rounded-full px-3 py-1.5 ${
                  streamHealthy ? "bg-live" : "bg-surface-3/80"
                }`}
              >
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: "#FFFFFF",
                  }}
                />
                <Text
                  className="text-[10px] font-extrabold uppercase tracking-widest text-white"
                  style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
                >
                  {streamHealthy ? "Live" : "Off"}
                </Text>
              </View>

              {listeners ? (
                <View className="flex-row items-center gap-1 rounded-full bg-black/50 px-2.5 py-1.5">
                  <Ionicons name="headset-outline" size={11} color="#FFFFFF" />
                  <Text
                    className="text-[10px] font-bold text-white"
                    style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                  >
                    {listeners}
                  </Text>
                </View>
              ) : null}
            </View>

            <View className="flex-row items-center gap-1 rounded-full bg-black/50 px-2.5 py-1.5">
              <Ionicons name="chatbubbles-outline" size={11} color={colors.brand} />
              <Text
                className="text-[10px] font-bold text-white"
                style={{ fontFamily: "PlusJakartaSans_700Bold" }}
              >
                Live chat
              </Text>
            </View>

            <View className="flex-row items-center gap-1 rounded-full bg-brand/20 border border-brand/40 px-2 py-1">
              <Ionicons name="videocam" size={11} color={colors.brand} />
              <Text
                className="text-[10px] font-bold text-brand"
                style={{ fontFamily: "PlusJakartaSans_700Bold" }}
              >
                Visual
              </Text>
            </View>
          </View>
        </View>
      </Pressable>

      {/* Bottom info + Play button strip */}
      <View className="flex-row items-end justify-between p-4 bg-surface">
        <Pressable
          onPress={onOpenDetail}
          className="min-w-0 flex-1 pr-3 active:opacity-80"
        >
          <Text
            className="text-[10px] font-bold uppercase tracking-widest text-brand"
            style={{ fontFamily: "PlusJakartaSans_700Bold" }}
          >
            {streamHealthy ? "Sedang mengudara" : "Siaran off"}
          </Text>
          <Text
            className="mt-1 text-xl font-extrabold leading-6 text-text"
            numberOfLines={2}
            style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
          >
            {title}
          </Text>
          <Text
            className="mt-0.5 text-sm text-text-dim"
            numberOfLines={1}
            style={{ fontFamily: "PlusJakartaSans_400Regular" }}
          >
            {host}
            {timeRange ? ` · ${timeRange}` : ""}
          </Text>
        </Pressable>

        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            void toggle();
          }}
          disabled={buffering}
          accessibilityRole="button"
          accessibilityLabel={playing ? "Stop siaran" : "Putar siaran"}
          className="h-16 w-16 shrink-0 items-center justify-center rounded-full bg-orange active:opacity-90 active:scale-95"
          style={streamHealthy ? glow.orange : undefined}
        >
          {buffering ? (
            <ActivityIndicator size="large" color="#FFFFFF" />
          ) : (
            <Ionicons
              name={playing ? "stop" : "play"}
              size={30}
              color="#FFFFFF"
              style={{ marginLeft: playing ? 0 : 3 }}
            />
          )}
        </Pressable>
      </View>

      {/* Error bar — shown only when stream fails */}
      {hasError ? (
        <View className="flex-row items-center justify-center gap-1.5 border-t border-line/40 px-4 py-3 bg-surface">
          <Ionicons name="warning-outline" size={14} color={colors.live} />
          <Text
            className="text-xs font-medium text-live"
            style={{ fontFamily: "PlusJakartaSans_500Medium" }}
          >
            Tidak dapat terhubung — ketuk tombol play untuk coba lagi
          </Text>
        </View>
      ) : null}
    </View>
  );
}
