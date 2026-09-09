import React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStore } from "../../stores/themeStore";
import { usePlayerStore } from "../../stores/playerStore";
import { getOfficialLiveHost } from "../../utils/announcer";
import type { Program } from "../../types";

export type ProgramCardStatus = "live" | "upNext" | "upcoming" | "done";

interface ProgramCardProps {
  program: Program;
  status: ProgramCardStatus;
  onPress?: () => void;
  onRemind?: () => void;
  isScheduled?: boolean;
  /** Live-only: playback state for the inline play/stop button. */
  isPlaying?: boolean;
  isBuffering?: boolean;
  onTogglePlay?: () => void;
  /** Live-only: elapsed fraction (0..1) of the current program, renders a thin progress bar. */
  progress?: number | null;
}

/**
 * Clean schedule row — time + cover + title/host + status.
 * Easy to scan; remind only on upcoming slots.
 * When live: doubles as the "now playing" widget (bigger cover, working
 * play/stop button, elapsed progress bar) — no separate hero card needed.
 */
export function ProgramCard({
  program,
  status,
  onPress,
  onRemind,
  isScheduled,
  isPlaying = false,
  isBuffering = false,
  onTogglePlay,
  progress = null,
}: ProgramCardProps) {
  const colors = useThemeStore((s) => s.colors);
  const nowPlaying = usePlayerStore((s) => s.nowPlaying);
  const isLive = status === "live";
  const isDone = status === "done";
  const isUpNext = status === "upNext";

  const liveHost = isLive ? getOfficialLiveHost(nowPlaying.current_host) : "";
  const displayHost = liveHost;
  const displayCover =
    isLive && liveHost && nowPlaying.current_cover_url
      ? nowPlaying.current_cover_url
      : program.cover_url;

  const body = (
    <View
      className={`mb-4 overflow-hidden rounded-[24px] border ${
        isLive
          ? "bg-orange/5 border-orange/40 shadow-sm shadow-orange/20"
          : isUpNext
            ? "bg-surface border-brand/40 shadow-sm shadow-brand/10"
            : isDone
              ? "bg-surface-2/60 border-line/20"
              : "bg-surface border-line/30 shadow-sm"
      }`}
      style={isDone ? { opacity: 0.65 } : undefined}
    >
      {isLive ? (
        <View className="absolute bottom-0 left-0 top-0 w-1.5 bg-orange" />
      ) : null}

      <View className="flex-row items-center gap-3.5 p-4">
        {/* Time */}
        <View className="w-[56px] items-center justify-center">
          <Text
            className={`text-[16px] font-extrabold tracking-tight ${
              isLive ? "text-orange" : isDone ? "text-text-dim" : "text-text"
            }`}
            style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
          >
            {program.start_time}
          </Text>
          <View className={`h-3 w-px my-1 ${isLive ? "bg-orange/30" : "bg-line/60"}`} />
          <Text
            className="text-[12px] font-bold text-text-dim"
            style={{ fontFamily: "PlusJakartaSans_700Bold" }}
          >
            {program.end_time}
          </Text>
        </View>

        {/* Cover — slightly bigger when live, doubling as the now-playing artwork */}
        <View
          className={`overflow-hidden rounded-[14px] bg-surface-3 border ${
            isLive ? "h-16 w-16 border-orange/20 shadow-sm" : "h-[54px] w-[54px] border-line/20"
          }`}
        >
          {displayCover ? (
            <Image
              source={{ uri: displayCover }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View className="h-full w-full items-center justify-center">
              <Ionicons name="mic" size={22} color={colors.brand} />
            </View>
          )}
        </View>

        {/* Meta */}
        <View className="min-w-0 flex-1 justify-center">
          {isLive ? (
            <View className="mb-1.5 flex-row items-center gap-1.5 self-start rounded-full bg-live px-2 py-0.5 shadow-sm shadow-live/30">
              <View
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: "#FFFFFF",
                }}
              />
              <Text
                className="text-[9px] font-extrabold uppercase tracking-widest text-white"
                style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
              >
                Sedang Live
              </Text>
            </View>
          ) : isUpNext ? (
            <Text
              className="mb-1 text-[10px] font-extrabold uppercase tracking-wider text-brand"
              style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
            >
              Selanjutnya
            </Text>
          ) : isDone ? (
            <Text
              className="mb-1 text-[10px] font-extrabold uppercase tracking-wider text-text-dim"
              style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
            >
              Selesai
            </Text>
          ) : null}

          <Text
            className={`text-[16px] font-extrabold leading-5 ${
              isDone ? "text-text-dim" : "text-text"
            }`}
            numberOfLines={1}
            style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
          >
            {program.name}
          </Text>
          {displayHost ? (
            <Text
              className="mt-0.5 text-[13px] font-semibold text-text-dim"
              numberOfLines={1}
              style={{ fontFamily: "PlusJakartaSans_600SemiBold" }}
            >
              {displayHost}
            </Text>
          ) : null}
        </View>

        {/* Action */}
        {!isLive && !isDone && onRemind ? (
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              onRemind();
            }}
            accessibilityRole="button"
            accessibilityLabel={
              isScheduled
                ? `Pengingat aktif untuk ${program.name}`
                : `Ingatkan ${program.name}`
            }
            hitSlop={8}
            className={`h-[42px] w-[42px] items-center justify-center rounded-full border ${
              isScheduled ? "bg-brand/15 border-brand/30" : "bg-surface-2 border-line/30"
            }`}
          >
            <Ionicons
              name={isScheduled ? "notifications" : "notifications-outline"}
              size={20}
              color={isScheduled ? colors.brand : colors.textDim}
            />
          </Pressable>
        ) : isLive && onTogglePlay ? (
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              onTogglePlay();
            }}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? "Stop siaran" : "Putar siaran"}
            hitSlop={8}
            className="h-12 w-12 items-center justify-center rounded-full bg-orange active:opacity-90 shadow-sm shadow-orange/40"
          >
            {isBuffering ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons
                name={isPlaying ? "stop" : "play"}
                size={22}
                color="#FFFFFF"
                style={isPlaying ? undefined : { marginLeft: 3 }}
              />
            )}
          </Pressable>
        ) : isLive ? (
          <View className="h-12 w-12 items-center justify-center rounded-full bg-orange/15 border border-orange/30">
            <Ionicons name="play" size={20} color={colors.orange} style={{ marginLeft: 3 }} />
          </View>
        ) : (
          <View className="h-[42px] w-[42px]" />
        )}
      </View>

      {isLive && progress != null ? (
        <View className="h-1 w-full bg-orange/15">
          <View
            className="h-full bg-orange"
            style={{ width: `${Math.max(2, Math.round(progress * 100))}%` }}
          />
        </View>
      ) : null}
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${program.name}, ${program.start_time} sampai ${program.end_time}, host ${program.host}${isLive ? ", live" : ""}`}
      className="active:opacity-85"
    >
      {body}
    </Pressable>
  );
}
