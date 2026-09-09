import React, { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
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
  getProgramProgress,
  partOfDay,
  PART_OF_DAY_LABEL,
  type PartOfDay,
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
 * Jadwal — ringkas & scannable.
 * Day strip → daftar per bagian hari (Pagi/Siang/Sore/Malam).
 * Program yang sedang mengudara ditandai langsung di baris list-nya
 * (cover lebih besar, badge Live, progress bar, tombol play/stop) —
 * tanpa kartu "now playing" duplikat, biar halaman tetap ringkas.
 */
export function ScheduleScreen() {
  const colors = useThemeStore((s) => s.colors);
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

  const onAirProgress = useMemo(
    () => (onAir ? getProgramProgress(onAir, now) : null),
    [onAir, now],
  );

  /** Group programs by time-of-day (Pagi/Siang/Sore/Malam) for easier scanning. */
  const groupedList = useMemo(() => {
    const order: PartOfDay[] = ["pagi", "siang", "sore", "malam"];
    const groups = new Map<PartOfDay, Program[]>();
    for (const program of list) {
      const hour = parseInt(program.start_time.split(":")[0] ?? "0", 10);
      const part = partOfDay(Number.isFinite(hour) ? hour : 0);
      const arr = groups.get(part) ?? [];
      arr.push(program);
      groups.set(part, arr);
    }
    return order
      .map((part) => ({ part, programs: groups.get(part) ?? [] }))
      .filter((g) => g.programs.length > 0);
  }, [list]);

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
          <View className="flex-row items-center gap-2">
            <Text
              className="text-[28px] font-extrabold tracking-tight text-text"
              style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
            >
              Jadwal
            </Text>
            {onAir ? (
              <View className="mb-1 flex-row items-center gap-1 rounded-full bg-live/15 px-2 py-0.5">
                <View
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 2.5,
                    backgroundColor: colors.live,
                  }}
                />
                <Text
                  className="text-[10px] font-bold uppercase tracking-widest text-live"
                  style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                >
                  Live
                </Text>
              </View>
            ) : null}
          </View>
          <Text
            className="mt-1 text-sm text-text-dim"
            numberOfLines={1}
            style={{ fontFamily: "PlusJakartaSans_400Regular" }}
          >
            {isToday ? "Hari ini" : DAY_FULL_ID[selectedDay]}
            {list.length > 0 ? ` · ${list.length} program` : ""}
            {onAir ? ` · ${onAir.name} sedang mengudara` : ""}
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

      {/* List — grouped by Pagi/Siang/Sore/Malam; on-air row doubles as now-playing */}
      <View className="mt-6 px-5">
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
            icon="musical-notes-outline"
            title="Musik Nonstop 24 Jam"
            message={`Tidak ada program siaran khusus di hari ${DAY_FULL_ID[selectedDay]}. Gaul FM memutarkan lagu-lagu hits terbaik nonstop 24 jam!`}
          />
        ) : (
          <View>
            {isToday && !onAir ? (
              <View className="mb-3 flex-row items-center gap-2.5 rounded-xl bg-surface-2 px-3.5 py-3">
                <Ionicons name="musical-notes-outline" size={16} color={colors.brand} />
                <Text
                  className="flex-1 text-xs leading-5 text-text-dim"
                  style={{ fontFamily: "PlusJakartaSans_400Regular" }}
                >
                  Di luar jadwal program: Gaul FM memutarkan musik hits nonstop 24 jam.
                </Text>
              </View>
            ) : null}
            {groupedList.map(({ part, programs: segmentPrograms }, groupIndex) => (
              <View key={part} className={groupIndex > 0 ? "mt-5" : undefined}>
                <View className="mb-3 flex-row items-center gap-2.5">
                  <Text
                    className="text-[11px] font-bold uppercase tracking-widest text-text-dim"
                    style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                  >
                    {PART_OF_DAY_LABEL[part]}
                  </Text>
                  <View className="h-px flex-1 bg-line/30" />
                </View>
                {segmentPrograms.map((program) => {
                  const isLiveProgram = program.id === onAir?.id;
                  return (
                    <ProgramCard
                      key={program.id}
                      program={program}
                      status={statusOf(program)}
                      onPress={() => openProgram(program)}
                      onRemind={() => void handleRemind(program)}
                      isScheduled={Boolean(reminders[program.id])}
                      isPlaying={isLiveProgram && playerStatus === "playing"}
                      isBuffering={isLiveProgram && playerStatus === "buffering"}
                      onTogglePlay={isLiveProgram ? () => void toggle() : undefined}
                      progress={isLiveProgram ? (onAirProgress?.elapsedPct ?? null) : null}
                    />
                  );
                })}
              </View>
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
