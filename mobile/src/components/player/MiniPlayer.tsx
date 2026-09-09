import React, { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStore } from "../../stores/themeStore";
import { usePlayerStore } from "../../stores/playerStore";
import { usePlayerControls } from "../../hooks/usePlayerControls";
import { useIcecastStats } from "../../hooks/useIcecastStats";
import { usePrograms } from "../../hooks/usePrograms";
import { isOnAirNow, todayDow } from "../../utils/datetime";
import { MarqueeText } from "../ui/MarqueeText";
import { LiveDetailSheet } from "./LiveDetailSheet";
import type { MainTabParamList } from "../../types";

interface MiniPlayerProps {
  /** @deprecated Tidak dipakai — mini player tampil di semua tab & sheet dibuka lokal. */
  activeRouteName?: keyof MainTabParamList | string;
  navigation?: {
    navigate: (screen: keyof MainTabParamList) => void;
  };
}

/**
 * Persistent chrome di atas tab bar: cover + program + listeners + play.
 * Tampil di SEMUA tab (termasuk Home) setelah stream pertama kali diputar —
 * pola native Spotify/YouTube Music. Tap bar → LiveDetailSheet full-screen.
 */
export function MiniPlayer(_props: MiniPlayerProps = {}) {
  const colors = useThemeStore((s) => s.colors);
  const glow = useThemeStore((s) => s.glow);
  const status = usePlayerStore((s) => s.status);
  const hasStarted = usePlayerStore((s) => s.hasStarted);
  const nowPlaying = usePlayerStore((s) => s.nowPlaying);
  const isVisualActive = usePlayerStore((s) => s.isVisualActive);
  const { toggle } = usePlayerControls();
  const { stats } = useIcecastStats();
  const todayPrograms = usePrograms(todayDow());
  const [liveOpen, setLiveOpen] = useState(false);

  // Persistent: tetap tampil setelah stream mulai, di tab mana pun (seperti Spotify).
  if (!hasStarted) {
    return null;
  }

  const playing = status === "playing";
  const buffering = status === "buffering";
  // Prefer on-air schedule so Mini matches Home/Jadwal.
  // Callers: MainTabs. User: "now playing di beranda samakan dengan jadwal".
  const matchedProgram =
    todayPrograms.data?.find((p) => isOnAirNow(p)) ?? null;
  const displayTitle = matchedProgram?.name ?? nowPlaying.current_program;
  const displayHost = matchedProgram?.host ?? nowPlaying.current_host;
  const displayCover =
    matchedProgram?.cover_url ?? nowPlaying.current_cover_url ?? null;
  const listeners = stats.isLive
    ? stats.listeners.toLocaleString("id-ID")
    : "—";

  return (
    <>
      <View className="border-t border-line/40 bg-surface-2 px-3 pb-1.5 pt-2">
        <View className="flex-row items-center gap-2 rounded-card bg-surface px-2.5 py-2">
          <Pressable
            onPress={() => setLiveOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`Buka live chat: ${displayTitle}`}
            className="min-w-0 flex-1 flex-row items-center gap-3 active:opacity-90"
          >
            <View className="h-12 w-12 overflow-hidden rounded-md bg-surface-3">
              {displayCover ? (
                <Image
                  source={{ uri: displayCover }}
                  style={{ width: 48, height: 48 }}
                  contentFit="cover"
                />
              ) : (
                <View className="h-12 w-12 items-center justify-center">
                  <Ionicons name="radio" size={22} color={colors.brand} />
                </View>
              )}
            </View>

            <View className="min-w-0 flex-1">
              <MarqueeText
                className="text-sm font-bold text-text"
                accessibilityLabel={`Program: ${displayTitle}`}
              >
                {displayTitle}
              </MarqueeText>
              <View className="mt-0.5 flex-row items-center gap-2">
                {isVisualActive ? (
                  <View className="flex-row items-center gap-1 rounded-full bg-live/15 px-1.5 py-0.5">
                    <Ionicons name="videocam" size={10} color="#FF3B30" />
                    <Text
                      className="text-[10px] font-bold text-live"
                      style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                    >
                      Visual
                    </Text>
                  </View>
                ) : playing ? (
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: colors.live,
                    }}
                  />
                ) : null}
                <Text
                  className="min-w-0 flex-1 text-xs text-text-dim"
                  numberOfLines={1}
                  style={{ fontFamily: "PlusJakartaSans_400Regular" }}
                >
                  {displayHost}
                </Text>
                <View className="flex-row items-center gap-0.5">
                  <Ionicons name="eye" size={12} color={colors.brand} />
                  <Text
                    className="text-[11px] font-bold text-brand"
                    style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                  >
                    {listeners}
                  </Text>
                </View>
              </View>
            </View>
          </Pressable>

          <Pressable
            onPress={() => void toggle()}
            disabled={buffering}
            accessibilityRole="button"
            accessibilityLabel={playing ? "Stop siaran" : "Putar siaran"}
            hitSlop={8}
            className="min-h-11 min-w-11 items-center justify-center rounded-full bg-orange"
            style={glow.orange}
          >
            {buffering ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons
                name={playing ? "stop" : "play"}
                size={20}
                color="#FFFFFF"
                style={{ marginLeft: playing ? 0 : 2 }}
              />
            )}
          </Pressable>
        </View>
      </View>

      <LiveDetailSheet
        visible={liveOpen}
        onClose={() => setLiveOpen(false)}
        nowPlaying={nowPlaying}
        matchedProgram={matchedProgram}
        autoPlayOnOpen
      />
    </>
  );
}
