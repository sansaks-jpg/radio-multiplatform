import React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStore } from "../../stores/themeStore";
import { usePlayerStore } from "../../stores/playerStore";
import { usePlayerControls } from "../../hooks/usePlayerControls";
import { useIcecastStats } from "../../hooks/useIcecastStats";
import { formatDurationMinutes, getProgramProgress } from "../../utils/datetime";
import { getOfficialLiveHost } from "../../utils/announcer";
import type { Program } from "../../types";

interface HomeHeroProps {
  matchedProgram?: Program | null;
  onOpenDetail: () => void;
  now?: Date;
}

/**
 * Dashboard hero — immersive now-playing card (DESIGN.md Sonic Pulse).
 * Full-bleed cover art, pulsing LIVE chip, listener count, glowing play CTA.
 * UX redesign: Play button floating over the bottom right edge of the artwork.
 */
export function HomeHero({ matchedProgram = null, onOpenDetail, now }: HomeHeroProps) {
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

  const liveHost = getOfficialLiveHost(nowPlaying.current_host);
  const title = matchedProgram?.name ?? nowPlaying.current_program;
  const cover =
    liveHost && nowPlaying.current_cover_url
      ? nowPlaying.current_cover_url
      : matchedProgram?.cover_url ?? nowPlaying.current_cover_url ?? null;
  const listeners = stats.isLive ? stats.listeners.toLocaleString("id-ID") : null;
  const timeRange = matchedProgram
    ? `${matchedProgram.start_time}–${matchedProgram.end_time} WIB`
    : null;
  const progress = matchedProgram ? getProgramProgress(matchedProgram, now) : null;

  return (
    <View 
      className="overflow-visible rounded-[28px] bg-surface border shadow-sm relative"
      style={{ borderColor: `${colors.line}40` }}
    >
      <Pressable
        onPress={onOpenDetail}
        accessibilityRole="button"
        accessibilityLabel={`Buka live chat: ${title}`}
        className="active:opacity-95"
      >
        <View className="h-[210px] w-full overflow-hidden rounded-t-[28px] bg-surface-3 relative">
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

          {/* Gradient scrims for text visibility and badge */}
          <View className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-black/60 to-transparent" />
          
          <View className="absolute left-4 right-4 top-4 flex-row items-center justify-between">
            <View
              className={`flex-row items-center gap-1.5 rounded-full px-3 py-1.5 ${
                streamHealthy ? "bg-live" : "bg-black/60"
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
               <View className="flex-row items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 backdrop-blur-md">
                 <Ionicons name="headset" size={12} color="#FFFFFF" />
                 <Text
                   className="text-[11px] font-bold text-white"
                   style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                 >
                   {listeners}
                 </Text>
               </View>
            ) : null}
          </View>
        </View>
      </Pressable>

      {/* Floating Play Button */}
      <View className="absolute top-[182px] right-5 z-20">
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            void toggle();
          }}
          disabled={buffering}
          accessibilityRole="button"
          accessibilityLabel={playing ? "Stop siaran" : "Putar siaran"}
          className="h-14 w-14 items-center justify-center rounded-full bg-orange active:opacity-80 active:scale-95 shadow-md shadow-orange/40"
          style={streamHealthy ? glow.orange : undefined}
        >
          {buffering ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons
              name={playing ? "stop" : "play"}
              size={26}
              color="#FFFFFF"
              style={{ marginLeft: playing ? 0 : 3 }}
            />
          )}
        </Pressable>
      </View>

      {/* Progress Bar (Attached to bottom of image) */}
      <View className="h-1 w-full bg-surface-3">
        {progress ? (
          <View
            className="h-full bg-orange"
            style={{ width: `${Math.max(2, Math.round(progress.elapsedPct * 100))}%` }}
          />
        ) : null}
      </View>

      {/* Bottom Info Section */}
      <Pressable 
        onPress={onOpenDetail}
        className="px-5 pt-4 pb-5 active:opacity-80"
      >
        <View className="pr-16">
          <Text
            className="text-[22px] font-extrabold leading-7 text-text"
            numberOfLines={2}
            style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
          >
            {title}
          </Text>
          
          <View className="mt-1.5 flex-row items-center flex-wrap gap-x-2 gap-y-1">
            {liveHost ? (
              <>
                <Text
                  className="text-[13px] font-medium text-text-dim"
                  style={{ fontFamily: "PlusJakartaSans_500Medium" }}
                >
                  {liveHost}
                </Text>
                {timeRange ? (
                  <View className="h-1 w-1 rounded-full bg-line" />
                ) : null}
              </>
            ) : null}

            {timeRange ? (
              <Text
                className="text-[12px] font-medium text-text-dim"
                style={{ fontFamily: "PlusJakartaSans_500Medium" }}
              >
                {timeRange}
              </Text>
            ) : null}
          </View>

          {progress ? (
            <View className="mt-2.5 flex-row items-center gap-1.5">
              <Ionicons name="time-outline" size={14} color={colors.orange} />
              <Text
                className="text-[12px] font-bold text-orange"
                style={{ fontFamily: "PlusJakartaSans_700Bold" }}
              >
                {formatDurationMinutes(progress.remainingMinutes)} lagi selesai
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>

      {/* Error bar */}
      {hasError ? (
        <View className="flex-row items-center justify-center gap-2 rounded-b-[28px] bg-live/10 px-4 py-3">
          <Ionicons name="warning-outline" size={16} color={colors.live} />
          <Text
            className="text-[12px] font-semibold text-live"
            style={{ fontFamily: "PlusJakartaSans_600SemiBold" }}
          >
            Koneksi terputus — coba ketuk play lagi
          </Text>
        </View>
      ) : null}
    </View>
  );
}
