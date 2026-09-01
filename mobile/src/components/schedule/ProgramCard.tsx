import React from "react";
import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStore } from "../../stores/themeStore";
import type { Program } from "../../types";

export type ProgramCardStatus = "live" | "upNext" | "upcoming" | "done";

interface ProgramCardProps {
  program: Program;
  status: ProgramCardStatus;
  onPress?: () => void;
  onRemind?: () => void;
  isScheduled?: boolean;
}

/**
 * Clean schedule row — time + cover + title/host + status.
 * Easy to scan; remind only on upcoming slots.
 */
export function ProgramCard({
  program,
  status,
  onPress,
  onRemind,
  isScheduled,
}: ProgramCardProps) {
  const colors = useThemeStore((s) => s.colors);
  const isLive = status === "live";
  const isDone = status === "done";
  const isUpNext = status === "upNext";

  const body = (
    <View
      className={`mb-3 overflow-hidden rounded-2xl ${
        isLive
          ? "bg-orange/10"
          : isUpNext
            ? "bg-surface border border-brand/25"
            : isDone
              ? "bg-surface/60"
              : "bg-surface"
      }`}
      style={isDone ? { opacity: 0.55 } : undefined}
    >
      {isLive ? (
        <View className="absolute bottom-0 left-0 top-0 w-1 bg-orange" />
      ) : null}

      <View className="flex-row items-center gap-3 p-3.5">
        {/* Time */}
        <View className="w-[52px] items-center">
          <Text
            className={`text-[15px] font-extrabold tracking-tight ${
              isLive ? "text-orange" : isDone ? "text-text-dim" : "text-text"
            }`}
            style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
          >
            {program.start_time}
          </Text>
          <Text
            className="mt-0.5 text-[11px] font-medium text-text-dim"
            style={{ fontFamily: "PlusJakartaSans_500Medium" }}
          >
            {program.end_time}
          </Text>
        </View>

        {/* Cover */}
        <View className="h-14 w-14 overflow-hidden rounded-xl bg-surface-2">
          {program.cover_url ? (
            <Image
              source={{ uri: program.cover_url }}
              style={{ width: 56, height: 56 }}
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
        <View className="min-w-0 flex-1">
          {isLive ? (
            <View className="mb-1 flex-row items-center gap-1.5 self-start rounded-full bg-live/15 px-2 py-0.5">
              <View
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 2.5,
                  backgroundColor: colors.live,
                }}
              />
              <Text
                className="text-[9px] font-bold uppercase tracking-widest text-live"
                style={{ fontFamily: "PlusJakartaSans_700Bold" }}
              >
                Live
              </Text>
            </View>
          ) : isUpNext ? (
            <Text
              className="mb-1 text-[10px] font-bold uppercase tracking-wider text-brand"
              style={{ fontFamily: "PlusJakartaSans_700Bold" }}
            >
              Selanjutnya
            </Text>
          ) : isDone ? (
            <Text
              className="mb-1 text-[10px] font-bold uppercase tracking-wider text-text-dim"
              style={{ fontFamily: "PlusJakartaSans_700Bold" }}
            >
              Selesai
            </Text>
          ) : null}

          <Text
            className={`text-[15px] font-extrabold leading-5 ${
              isDone ? "text-text-dim" : "text-text"
            }`}
            numberOfLines={1}
            style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
          >
            {program.name}
          </Text>
          <Text
            className="mt-0.5 text-xs font-semibold text-brand"
            numberOfLines={1}
            style={{ fontFamily: "PlusJakartaSans_600SemiBold" }}
          >
            {program.host}
          </Text>
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
            className={`h-10 w-10 items-center justify-center rounded-full ${
              isScheduled ? "bg-brand/15" : "bg-surface-2"
            }`}
          >
            <Ionicons
              name={isScheduled ? "notifications" : "notifications-outline"}
              size={18}
              color={isScheduled ? colors.brand : colors.textDim}
            />
          </Pressable>
        ) : isLive ? (
          <View className="h-10 w-10 items-center justify-center rounded-full bg-orange/15">
            <Ionicons name="play" size={16} color={colors.orange} />
          </View>
        ) : (
          <View className="h-10 w-10" />
        )}
      </View>
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
