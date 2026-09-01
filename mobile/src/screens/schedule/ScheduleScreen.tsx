import React, { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useThemeStore } from "../../stores/themeStore";
import { usePlayerStore } from "../../stores/playerStore";
import { useReminderStore } from "../../stores/reminderStore";
import { usePlayerControls } from "../../hooks/usePlayerControls";
import { usePrograms } from "../../hooks/usePrograms";
import {
  DAY_FULL_ID,
  isOnAirNow,
  todayDow,
  getMinutesToProgram,
  getWibParts,
} from "../../utils/datetime";
import { showToast } from "../../stores/toastStore";
import { Screen } from "../../components/ui/Screen";
import { TopNavbar } from "../../components/ui/TopNavbar";
import { OfflineBanner } from "../../components/ui/OfflineBanner";
import { Skeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { DaySelector } from "../../components/schedule/DaySelector";
import {
  ProgramCard,
  type ProgramCardStatus,
} from "../../components/schedule/ProgramCard";
import { LiveDetailSheet } from "../../components/player/LiveDetailSheet";
import type { Program, ScheduleStackParamList } from "../../types";

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((p) => parseInt(p, 10));
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

/** Past program for *today* only (already finished). */
function isPastToday(program: Program, now = new Date()): boolean {
  const { day, totalMinutes } = getWibParts(now);
  if (program.day_of_week !== day) return false;
  if (isOnAirNow(program, now)) return false;
  const start = toMinutes(program.start_time);
  const end = toMinutes(program.end_time);
  if (end > start) return totalMinutes >= end;
  return false;
}

/**
 * Jadwal — simple, scannable day schedule.
 * Day strip → live hero (if any) → clean program list.
 */
export function ScheduleScreen() {
  const colors = useThemeStore((s) => s.colors);
  const glow = useThemeStore((s) => s.glow);
  const navigation =
    useNavigation<NativeStackNavigationProp<ScheduleStackParamList>>();
  const playerStatus = usePlayerStore((s) => s.status);
  const nowPlaying = usePlayerStore((s) => s.nowPlaying);
  const { toggle, play } = usePlayerControls();

  const [selectedDay, setSelectedDay] = useState(todayDow());
  const [liveOpen, setLiveOpen] = useState(false);
  const reminders = useReminderStore((s) => s.reminders);
  const addReminder = useReminderStore((s) => s.addReminder);
  const removeReminder = useReminderStore((s) => s.removeReminder);

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const programs = usePrograms(selectedDay);
  const list = useMemo(() => programs.data ?? [], [programs.data]);
  const isToday = selectedDay === todayDow(now);

  const onAir = useMemo(
    () => (isToday ? (list.find((p) => isOnAirNow(p, now)) ?? null) : null),
    [list, isToday, now],
  );

  const upNextId = useMemo(() => {
    if (!isToday) return null;
    const upcoming = list.find((p) => !isOnAirNow(p, now) && !isPastToday(p, now));
    return upcoming?.id ?? null;
  }, [list, isToday, now]);

  const statusOf = (program: Program): ProgramCardStatus => {
    if (isOnAirNow(program, now)) return "live";
    if (isToday && isPastToday(program, now)) return "done";
    if (program.id === upNextId) return "upNext";
    return "upcoming";
  };

  const openProgram = (program: Program) => {
    if (isOnAirNow(program, now)) {
      setLiveOpen(true);
      if (playerStatus !== "playing" && playerStatus !== "buffering") {
        void play();
      }
      return;
    }
    navigation.navigate("ProgramDetail", { id: program.id });
  };

  const handleRemind = async (program: Program) => {
    if (reminders[program.id]) {
      await removeReminder(program.id);
      showToast(`Pengingat dibatalkan · ${program.name}`, "info");
      return;
    }

    const mins = getMinutesToProgram(program, now);
    const ok = await addReminder(program.id, program.name, mins, program.cover_url);
    if (ok) {
      showToast(`Pengingat aktif · ${program.name}`, "success");
    } else {
      showToast(
        "Gagal mengaktifkan pengingat. Cek izin notifikasi di Pengaturan.",
        "error",
      );
    }
  };

  const goToday = () => setSelectedDay(todayDow());

  return (
    <Screen
      scroll
      dockInset="dock"
      refreshing={programs.isRefetching}
      onRefresh={() => void programs.refetch()}
      contentStyle={{ paddingHorizontal: 0 }}
    >
      <TopNavbar className="mt-1 px-5" />

      <View className="mt-4 flex-row items-end justify-between px-5">
        <View className="min-w-0 flex-1">
          <Text
            className="text-[28px] font-extrabold tracking-tight text-text"
            style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
          >
            Jadwal
          </Text>
          <Text
            className="mt-1 text-sm text-text-dim"
            style={{ fontFamily: "PlusJakartaSans_400Regular" }}
          >
            {isToday ? "Hari ini" : DAY_FULL_ID[selectedDay]}
            {list.length > 0 ? ` · ${list.length} program` : ""}
          </Text>
        </View>

        {!isToday ? (
          <Pressable
            onPress={goToday}
            accessibilityRole="button"
            accessibilityLabel="Kembali ke hari ini"
            className="mb-0.5 flex-row items-center gap-1 rounded-full bg-brand/12 px-3 py-2 active:opacity-85"
          >
            <Ionicons name="today-outline" size={14} color={colors.brand} />
            <Text
              className="text-xs font-bold text-brand"
              style={{ fontFamily: "PlusJakartaSans_700Bold" }}
            >
              Hari ini
            </Text>
          </Pressable>
        ) : null}
      </View>

      <OfflineBanner />

      {/* Day strip */}
      <View className="mt-5">
        <DaySelector selected={selectedDay} onSelect={setSelectedDay} />
      </View>

      {/* Live hero — only when something is on air today */}
      {onAir && !programs.isLoading ? (
        <View className="mx-5 mt-6 overflow-hidden rounded-2xl bg-surface">
          <View className="flex-row">
            <Pressable
              onPress={() => openProgram(onAir)}
              accessibilityRole="button"
              accessibilityLabel={`Sedang mengudara: ${onAir.name}`}
              className="min-w-0 flex-1 flex-row active:opacity-90"
            >
              <View className="h-[112px] w-[112px] overflow-hidden bg-surface-2">
                {onAir.cover_url ? (
                  <Image
                    source={{ uri: onAir.cover_url }}
                    style={{ width: 112, height: 112 }}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <View className="h-full w-full items-center justify-center">
                    <Ionicons name="radio" size={36} color={colors.brand} />
                  </View>
                )}
              </View>
              <View className="min-w-0 flex-1 justify-center px-3.5 py-3">
                <View className="flex-row items-center gap-1.5 self-start rounded-full bg-live/15 px-2.5 py-1">
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: colors.live,
                    }}
                  />
                  <Text
                    className="text-[10px] font-bold uppercase tracking-widest text-live"
                    style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                  >
                    Sedang mengudara
                  </Text>
                </View>
                <Text
                  className="mt-2 text-base font-extrabold text-text"
                  numberOfLines={1}
                  style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
                >
                  {onAir.name}
                </Text>
                <Text
                  className="mt-0.5 text-sm font-semibold text-brand"
                  numberOfLines={1}
                  style={{ fontFamily: "PlusJakartaSans_600SemiBold" }}
                >
                  {onAir.host}
                </Text>
                <Text
                  className="mt-1 text-xs text-text-dim"
                  style={{ fontFamily: "PlusJakartaSans_500Medium" }}
                >
                  {onAir.start_time} – {onAir.end_time} WIB
                </Text>
              </View>
            </Pressable>
            <View className="items-center justify-center pr-3.5">
              <Pressable
                onPress={() => void toggle()}
                accessibilityRole="button"
                accessibilityLabel={
                  playerStatus === "playing"
                    ? "Stop siaran"
                    : "Dengarkan siaran langsung"
                }
                hitSlop={6}
                className="h-12 w-12 items-center justify-center rounded-full bg-orange active:opacity-90"
                style={glow.orange}
              >
                <Ionicons
                  name={playerStatus === "playing" ? "stop" : "play"}
                  size={22}
                  color="#FFFFFF"
                  style={
                    playerStatus === "playing" ? undefined : { marginLeft: 2 }
                  }
                />
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      {/* List */}
      <View className="mt-6 px-5">
        <View className="mb-3 flex-row items-center justify-between">
          <Text
            className="text-[13px] font-bold uppercase tracking-widest text-text-dim"
            style={{ fontFamily: "PlusJakartaSans_700Bold" }}
          >
            {isToday ? "Program hari ini" : `Program ${DAY_FULL_ID[selectedDay]}`}
          </Text>
          {list.length > 0 ? (
            <Text
              className="text-[11px] font-semibold text-text-dim"
              style={{ fontFamily: "PlusJakartaSans_600SemiBold" }}
            >
              WIB
            </Text>
          ) : null}
        </View>

        {programs.isLoading ? (
          <View className="gap-3">
            <Skeleton className="h-[76px] w-full rounded-2xl" />
            <Skeleton className="h-[76px] w-full rounded-2xl" />
            <Skeleton className="h-[76px] w-full rounded-2xl" />
          </View>
        ) : programs.isError ? (
          <ErrorState onRetry={() => void programs.refetch()} />
        ) : list.length === 0 ? (
          <EmptyState
            icon="calendar-clear-outline"
            title="Belum ada jadwal"
            message={`Tidak ada program di hari ${DAY_FULL_ID[selectedDay]}. Coba hari lain.`}
          />
        ) : (
          <View>
            {isToday && !onAir ? (
              <View className="mb-3 flex-row items-center gap-2.5 rounded-xl bg-surface-2 px-3.5 py-3">
                <Ionicons name="moon-outline" size={16} color={colors.textDim} />
                <Text
                  className="flex-1 text-xs leading-5 text-text-dim"
                  style={{ fontFamily: "PlusJakartaSans_400Regular" }}
                >
                  Tidak ada siaran sekarang.
                </Text>
              </View>
            ) : null}
            {list.map((program) => (
              <ProgramCard
                key={program.id}
                program={program}
                status={statusOf(program)}
                onPress={() => openProgram(program)}
                onRemind={() => void handleRemind(program)}
                isScheduled={Boolean(reminders[program.id])}
              />
            ))}
          </View>
        )}
      </View>

      <View className="h-6" />

      <LiveDetailSheet
        visible={liveOpen}
        onClose={() => setLiveOpen(false)}
        nowPlaying={nowPlaying}
        matchedProgram={onAir}
        autoPlayOnOpen
      />
    </Screen>
  );
}
