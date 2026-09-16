import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { MotionPressable as Pressable } from "../ui/MotionPressable";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStore } from "../../stores/themeStore";
import { usePlayerStore } from "../../stores/playerStore";
import { getOfficialLiveHost } from "../../utils/announcer";
import { getProgramArtwork } from "../../utils/programAssets";
import type { PlayerStatus, Program } from "../../types";

export type ProgramCardStatus = "live" | "upNext" | "upcoming" | "done";

interface ProgramCardProps {
  program: Program;
  status: ProgramCardStatus;
  onPress?: () => void;
  onRemind?: () => void;
  onListen?: () => void;
  playerStatus?: PlayerStatus;
  isScheduled?: boolean;
  /** Live-only: elapsed fraction (0..1) of the current program, renders a thin progress bar. */
  progress?: number | null;
}

/**
 * Clean schedule row — time + cover + title/host + status.
 * Easy to scan; remind only on upcoming slots.
 * Live keeps the same geometry as every other row; only color, icon, and
 * progress communicate its state so the list never jumps in height.
 */
export function ProgramCard({
  program,
  status,
  onPress,
  onRemind,
  onListen,
  playerStatus,
  isScheduled,
  progress = null,
}: ProgramCardProps) {
  const colors = useThemeStore((s) => s.colors);
  const nowPlaying = usePlayerStore((s) => s.nowPlaying);
  const isLive = status === "live";
  const isDone = status === "done";
  const isUpNext = status === "upNext";

  const liveHost = isLive ? getOfficialLiveHost(nowPlaying.current_host) : "";
  const displayHost = liveHost || program.host;
  const displayCover = program.cover_url;

  const statusLabel = isLive ? "Sedang live" : isDone ? "Selesai" : isUpNext ? "Selanjutnya" : "Akan datang";
  const openLabel = `Detail ${program.name}, ${program.start_time} sampai ${program.end_time} WIB`;

  return (
    <View className={`mb-3 overflow-hidden rounded-2xl border bg-surface ${isLive ? "border-orange/50" : "border-line/30"}`}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={openLabel} className="flex-row flex-wrap items-center justify-between gap-2 px-4 pt-3">
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="time-outline" size={14} color={isLive ? colors.orange : colors.textDim} />
          <Text className="text-xs font-bold text-text-dim" style={{ fontFamily: "PlusJakartaSans_700Bold" }}>{program.start_time} – {program.end_time}</Text>
        </View>
        <View className={`rounded-full px-2 py-1 ${isLive ? "bg-orange/10" : isUpNext ? "bg-brand/10" : "bg-surface-2"}`}>
          <Text className={`text-[10px] font-bold ${isLive ? "text-orange" : isUpNext ? "text-brand" : "text-text-dim"}`} style={{ fontFamily: "PlusJakartaSans_700Bold" }}>{statusLabel}</Text>
        </View>
      </Pressable>
      <View className="flex-row items-center pr-3">
        <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={openLabel} className="min-w-0 flex-1 flex-row items-center gap-3 px-4 py-3" style={{ minHeight: 88 }}>
          <View className="h-14 w-14 overflow-hidden rounded-xl bg-surface-3">
            <Image source={getProgramArtwork(program.name, displayCover)} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={180} />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-[15px] leading-5 font-bold text-text" numberOfLines={2} style={{ fontFamily: "PlusJakartaSans_700Bold" }}>{program.name}</Text>
            <Text className="mt-1 text-xs text-text-dim" numberOfLines={1} style={{ fontFamily: "PlusJakartaSans_400Regular" }}>{displayHost || "Gaul FM"}</Text>
          </View>
        </Pressable>
        {isLive ? (
          <Pressable onPress={onListen} disabled={playerStatus === "buffering"} accessibilityRole="button" accessibilityLabel={playerStatus === "playing" ? "Hentikan siaran" : `Dengarkan ${program.name}`} className="h-11 w-11 items-center justify-center rounded-full bg-orange">
            {playerStatus === "buffering" ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name={playerStatus === "playing" ? "stop" : "play"} size={19} color="#FFFFFF" />}
          </Pressable>
        ) : !isDone && onRemind ? (
          <Pressable onPress={onRemind} accessibilityRole="button" accessibilityLabel={`${isScheduled ? "Batalkan pengingat" : "Ingatkan"} ${program.name}, ${program.start_time} WIB`} accessibilityState={{ selected: Boolean(isScheduled) }} className={`h-11 w-11 items-center justify-center rounded-full ${isScheduled ? "bg-brand/15" : "bg-surface-2"}`}>
            <Ionicons name={isScheduled ? "notifications" : "notifications-outline"} size={20} color={isScheduled ? colors.brand : colors.textDim} />
          </Pressable>
        ) : (
          <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={openLabel} className="h-11 w-11 items-center justify-center"><Ionicons name="chevron-forward" size={18} color={colors.textDim} /></Pressable>
        )}
      </View>
      {isLive && progress != null ? <View className="h-0.5 bg-orange/10"><View className="h-full bg-orange" style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }} /></View> : <View className="h-0.5" />}
    </View>
  );
}
