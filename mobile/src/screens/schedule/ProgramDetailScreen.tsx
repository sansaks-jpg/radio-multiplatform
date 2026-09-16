import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, BackHandler, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { MotionPressable as Pressable } from "../../components/ui/MotionPressable";
import { Reveal } from "../../components/ui/Reveal";
import { ProgramHosts } from "../../components/schedule/ProgramHosts";
import { Ionicons } from "@expo/vector-icons";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  type RouteProp,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useThemeStore } from "../../stores/themeStore";
import { usePlayerStore } from "../../stores/playerStore";
import { useReminderStore } from "../../stores/reminderStore";
import { usePlayerControls } from "../../hooks/usePlayerControls";
import {
  useProgramById,
  useProgramWeekSlots,
} from "../../hooks/usePrograms";
import { getProgramArtwork } from "../../utils/programAssets";
import {
  DAY_FULL_ID,
  DAY_SHORT_ID,
  getMinutesToProgram,
  getNextProgramSlot,
  formatDateID,
  isOnAirNow,
  todayDow,
} from "../../utils/datetime";
import { showToast } from "../../stores/toastStore";
import { Screen } from "../../components/ui/Screen";
import { EmptyState } from "../../components/ui/EmptyState";
import { Button } from "../../components/ui/Button";
import { LiveBadge } from "../../components/player/LiveBadge";
import type { Program, ScheduleStackParamList } from "../../types";

function formatCountdown(mins: number): string {
  if (mins <= 0) return "Segera mulai";
  if (mins < 60) return `${mins} mnt lagi`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h < 24) return m > 0 ? `${h} jam ${m} mnt lagi` : `${h} jam lagi`;
  const d = Math.floor(h / 24);
  return d === 1 ? "Besok" : `${d} hari lagi`;
}



/**
 * Full program page (show-first): hero, host, description, weekly slots, CTA.
 * Nested under Schedule stack — not a bottom tab. (plan §2.7)
 */
export function ProgramDetailScreen() {
  const colors = useThemeStore((s) => s.colors);
  const glow = useThemeStore((s) => s.glow);
  const navigation =
    useNavigation<NativeStackNavigationProp<ScheduleStackParamList>>();
  const route = useRoute<RouteProp<ScheduleStackParamList, "ProgramDetail">>();
  const id = route.params?.id ?? "";
  const fromHome = route.params?.fromHome;
  const remote = useProgramById(id);
  const program = remote.data;
  const weekSlots = useProgramWeekSlots(program?.name);
  const playerStatus = usePlayerStore((s) => s.status);
  const nowPlaying = usePlayerStore((s) => s.nowPlaying);
  const openLiveSheet = usePlayerStore((s) => s.openLiveSheet);
  const { toggle } = usePlayerControls();
  const reminders = useReminderStore((s) => s.reminders);
  const addReminder = useReminderStore((s) => s.addReminder);
  const removeReminder = useReminderStore((s) => s.removeReminder);

  const [now, setNow] = useState(() => new Date());
  const [showWeekSchedule, setShowWeekSchedule] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const loading = !program && remote.isLoading;
  const isError = remote.isError;
  const slots = weekSlots.data ?? [];
  const liveSlot = slots.find((slot) => isOnAirNow(slot, now));
  const nextSlot = getNextProgramSlot(slots, now);
  const onAir = Boolean(liveSlot);
  const isPlaying = playerStatus === "playing";
  const isBuffering = playerStatus === "buffering";
  const minsTo = nextSlot ? getMinutesToProgram(nextSlot, now) : 0;
  const countdown = nextSlot && !onAir ? formatCountdown(minsTo) : null;
  const nextDate = nextSlot ? formatDateID(new Date(now.getTime() + minsTo * 60_000).toISOString()) : "";
  const isScheduled = nextSlot ? Boolean(reminders[nextSlot.id]) : false;
  const today = todayDow(now);

  const listenLive = () => {
    void toggle();
  };

  const handleRemind = async (target: Program) => {
    if (reminders[target.id]) {
      await removeReminder(target.id);
      showToast(`Pengingat dibatalkan · ${target.name}`, "info");
      return;
    }

    const mins = getMinutesToProgram(target, now);
    const ok = await addReminder(target.id, target.name, mins, target.cover_url);
    if (ok) {
      showToast(`Pengingat aktif · ${target.name}`, "success");
    } else {
      showToast(
        "Gagal mengaktifkan pengingat. Cek izin notifikasi di Pengaturan.",
        "error",
      );
    }
  };

  const handleCustomBack = useCallback(() => {
    if (fromHome) {
      const tabNav = navigation.getParent();
      tabNav?.navigate("Home" as never);
      navigation.navigate("ScheduleList" as never);
      return true;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
      return true;
    }
    navigation.navigate("ScheduleList" as never);
    return true;
  }, [fromHome, navigation]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => handleCustomBack();
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );
      return () => subscription.remove();
    }, [handleCustomBack]),
  );

  return (
    <Screen scroll dockInset="dock" contentStyle={{ paddingHorizontal: 0, paddingBottom: 16 }}>
      <View className="absolute left-4 right-4 top-1 z-10 flex-row items-center justify-between">
        <Pressable
          onPress={handleCustomBack}
          accessibilityRole="button"
          accessibilityLabel="Kembali"
          className="h-11 w-11 items-center justify-center rounded-full bg-surface active:opacity-80"
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>

        {nextSlot ? (
          <Pressable
            onPress={() => void handleRemind(nextSlot)}
            accessibilityRole="button"
            accessibilityLabel={
              isScheduled ? "Batalkan pengingat" : "Ingatkan saya"
            }
            className={`h-11 w-11 items-center justify-center rounded-full backdrop-blur-md active:opacity-80 ${
              isScheduled ? "bg-orange" : "bg-surface-lowest/80"
            }`}
          >
            <Ionicons
              name={isScheduled ? "notifications" : "notifications-outline"}
              size={20}
              color={isScheduled ? colors.onBrand : colors.text}
            />
          </Pressable>
        ) : (
          <View className="h-11 w-11" />
        )}
      </View>

      {loading ? (
        <View className="mt-24 items-center">
          <ActivityIndicator color={colors.brand} size="large" />
          <Text
            className="mt-3 text-sm text-text-dim"
            style={{ fontFamily: "PlusJakartaSans_400Regular" }}
          >
            Memuat program…
          </Text>
        </View>
      ) : isError ? (
        <View className="mt-14 px-4 items-center">
          <EmptyState
            icon="wifi-outline"
            title="Gagal memuat program"
            message="Terjadi gangguan jaringan saat mengambil data program."
          />
          <View className="mt-4 w-48">
            <Button title="Coba Lagi" onPress={() => remote.refetch()} variant="secondary" />
          </View>
        </View>
      ) : !program ? (
        <View className="mt-14 px-4">
          <EmptyState
            icon="mic-outline"
            title="Program tidak ditemukan"
            message="Program ini belum tersedia. Coba buka lagi dari Jadwal."
          />
        </View>
      ) : (
        <View>
          {/* Hero */}
          <View className="relative h-[188px] w-full bg-surface-3">
            <Image
              source={getProgramArtwork(program.name, program.cover_url)}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              transition={280}
            />
            <LinearGradient colors={["rgba(0,0,0,0.12)", "transparent", "rgba(0,0,0,0.85)"]} locations={[0, 0.25, 1]} style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }} pointerEvents="none" />

            <View className="absolute inset-x-0 bottom-0 gap-1.5 p-4">
              <View className="flex-row items-center gap-2">
                {onAir ? <LiveBadge active size="sm" label="ON AIR" /> : null}
                {countdown ? (
                  <View className="rounded-full bg-white/15 px-2.5 py-1">
                    <Text
                      className="text-[10px] font-bold uppercase tracking-wider text-white"
                      style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                    >
                      {countdown}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text
                className="text-[22px] font-extrabold leading-7 tracking-tight text-white"
                numberOfLines={2}
                style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
              >
                {program.name}
              </Text>
            </View>
          </View>

          <View className="mx-5 mt-4 rounded-2xl border border-line/30 bg-surface p-4">
            <Text className="text-xs font-bold text-brand" style={{ fontFamily: "PlusJakartaSans_700Bold" }}>{onAir ? "Sedang mengudara" : "Tayang berikutnya"}</Text>
            <Text className="mt-1 text-base font-bold text-text" style={{ fontFamily: "PlusJakartaSans_700Bold" }}>
              {onAir && liveSlot ? `${DAY_FULL_ID[liveSlot.day_of_week]} · ${liveSlot.start_time}–${liveSlot.end_time} WIB` : nextSlot ? `${DAY_FULL_ID[nextSlot.day_of_week]}, ${nextDate} · ${nextSlot.start_time} WIB` : "Jadwal belum tersedia"}
            </Text>
            <Text className="mt-2 text-xs leading-5 text-text-dim" style={{ fontFamily: "PlusJakartaSans_400Regular" }}>
              Slot dipilih: {DAY_FULL_ID[program.day_of_week]} · {program.start_time}–{program.end_time} WIB{program.day_of_week === today && !isOnAirNow(program, now) && getMinutesToProgram(program, now) > 6 * 1440 ? " · Sudah selesai" : ""}
            </Text>
          </View>
          {/* Primary action stays above the fold instead of being buried after the schedule. */}
          <View className="px-5 pt-4">
            {onAir ? (
              <Pressable
                onPress={listenLive}
                disabled={isBuffering}
                accessibilityRole="button"
                accessibilityLabel={
                  isPlaying || isBuffering
                    ? "Hentikan siaran"
                    : "Dengarkan siaran langsung"
                }
                className="min-h-12 flex-row items-center justify-center gap-2 rounded-md bg-orange active:opacity-90"
                style={glow.orange}
              >
                {isBuffering ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons
                    name={isPlaying ? "stop" : "play"}
                    size={18}
                    color="#FFFFFF"
                  />
                )}
                <Text
                  className="text-base font-extrabold text-white"
                  style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
                >
                  {isPlaying || isBuffering ? "Hentikan siaran" : "Dengarkan Live"}
                </Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => nextSlot && void handleRemind(nextSlot)}
                disabled={!nextSlot}
                accessibilityRole="button"
                accessibilityLabel={
                  isScheduled ? "Batalkan pengingat" : "Ingatkan saya"
                }
                className={`min-h-12 flex-row items-center justify-center gap-2 rounded-md border active:opacity-90 ${
                  isScheduled
                    ? "border-brand/35 bg-brand/15"
                    : "border-brand/45 bg-brand/10"
                }`}
              >
                <Ionicons
                  name={isScheduled ? "checkmark-circle" : "notifications"}
                  size={18}
                  color={colors.brand}
                />
                <Text
                  className="text-base font-extrabold text-brand"
                  style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
                >
                  {isScheduled ? "Batalkan pengingat" : "Ingatkan tayangan berikutnya"}
                </Text>
              </Pressable>
            )}
          </View>

          <View className="px-5">
            {onAir ? <Pressable onPress={() => openLiveSheet({ chatFullscreen: true, visual: false })} accessibilityRole="button" className="mt-3 min-h-12 flex-row items-center justify-center gap-2 rounded-xl bg-brand/10">
              <Ionicons name="chatbubbles-outline" size={18} color={colors.brand} />
              <Text className="text-sm font-bold text-brand" style={{ fontFamily: "PlusJakartaSans_700Bold" }}>Buka live chat</Text>
            </Pressable> : <Text className="mt-2 text-center text-xs leading-5 text-text-dim" style={{ fontFamily: "PlusJakartaSans_400Regular" }}>Pengingat untuk {nextSlot ? `${DAY_FULL_ID[nextSlot.day_of_week]}, ${nextDate} pukul ${nextSlot.start_time} WIB` : "jadwal berikutnya"}</Text>}
            <ProgramHosts name={program.name} liveHost={onAir ? nowPlaying.current_host : null} />
            {program.description ? (
              <View className="mt-3 rounded-card bg-surface p-4">
                <Text
                  className="text-[11px] font-bold uppercase tracking-widest text-text-dim"
                  style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                >
                  Tentang program
                </Text>
                <Text
                  className="mt-2 text-sm leading-6 text-text"
                  style={{ fontFamily: "PlusJakartaSans_400Regular" }}
                >
                  {program.description}
                </Text>
              </View>
            ) : null}

            {/* Weekly slots — disclosed on demand to keep the primary action visible. */}
            <Pressable
              onPress={() => setShowWeekSchedule((visible) => !visible)}
              accessibilityRole="button"
              accessibilityLabel="Tampilkan jadwal minggu ini"
              accessibilityState={{ expanded: showWeekSchedule }}
              className="mt-5 flex-row items-center rounded-xl bg-surface px-3.5 py-3 active:opacity-85"
            >
              <View className="mr-2 h-4 w-1 rounded-full bg-brand" />
              <View className="min-w-0 flex-1">
                <Text
                  className="text-[12px] font-bold uppercase tracking-widest text-text"
                  style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                >
                  Jadwal mingguan
                </Text>
                <Text
                  className="mt-0.5 text-[11px] text-text-dim"
                  style={{ fontFamily: "PlusJakartaSans_400Regular" }}
                >
                  {(weekSlots.data ?? []).length} slot siaran
                </Text>
              </View>
              <Ionicons
                name={showWeekSchedule ? "chevron-up" : "chevron-down"}
                size={18}
                color={colors.textDim}
              />
            </Pressable>

            {showWeekSchedule ? <Reveal><View className="mt-2 gap-2">
              {(weekSlots.data ?? []).map((slot) => {
                const slotOnAir = isOnAirNow(slot, now);
                const isToday = slot.day_of_week === today;
                const slotScheduled = Boolean(reminders[slot.id]);
                return (
                  <View
                    key={slot.id}
                    className={`flex-row items-center gap-3 rounded-xl px-3.5 py-3 ${
                      slotOnAir ? "bg-orange/10" : "bg-surface"
                    }`}
                  >
                    <View className="w-12 items-center">
                      <Text
                        className={`text-xs font-extrabold ${
                          isToday ? "text-brand" : "text-text-dim"
                        }`}
                        style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
                      >
                        {DAY_SHORT_ID[slot.day_of_week]}
                      </Text>
                      {isToday ? (
                        <Text
                          className="mt-0.5 text-[9px] font-bold uppercase text-brand"
                          style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                        >
                          Hari ini
                        </Text>
                      ) : null}
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text
                        className={`text-sm font-semibold ${
                          slotOnAir ? "text-orange" : "text-text"
                        }`}
                        style={{ fontFamily: "PlusJakartaSans_600SemiBold" }}
                      >
                        {slot.start_time} – {slot.end_time} WIB
                      </Text>
                      {slotOnAir ? (
                        <Text
                          className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-live"
                          style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                        >
                          Sedang mengudara
                        </Text>
                      ) : (
                        <Text
                          className="mt-0.5 text-[11px] text-text-dim"
                          style={{ fontFamily: "PlusJakartaSans_400Regular" }}
                        >
                          {formatDateID(new Date(now.getTime() + getMinutesToProgram(slot, now) * 60_000).toISOString())}
                        </Text>
                      )}
                    </View>
                    {!slotOnAir ? (
                      <Pressable
                        onPress={() => void handleRemind(slot)}

                        accessibilityRole="button"
                        accessibilityLabel={
                          slotScheduled
                            ? `Pengingat aktif ${DAY_FULL_ID[slot.day_of_week]}`
                            : `Ingatkan ${DAY_FULL_ID[slot.day_of_week]}`
                        }
                        hitSlop={6}
                        className={`min-h-10 min-w-10 items-center justify-center rounded-lg ${
                          slotScheduled ? "bg-brand/15" : "bg-surface-2"
                        }`}
                      >
                        <Ionicons
                          name={
                            slotScheduled
                              ? "notifications"
                              : "notifications-outline"
                          }
                          size={18}
                          color={
                            slotScheduled ? colors.brand : colors.textDim
                          }
                        />
                      </Pressable>
                    ) : (
                      <View className="h-2.5 w-2.5 rounded-full bg-live" />
                    )}
                  </View>
                );
              })}
            </View></Reveal> : null}
          </View>

          <View className="h-4" />
        </View>
      )}
    </Screen>
  );
}
