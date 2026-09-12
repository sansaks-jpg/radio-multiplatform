import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, BackHandler, Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
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
import { useAnnouncers } from "../../hooks/useAnnouncers";
import { isHostOnAir } from "../../utils/announcer";
import { getProgramArtwork } from "../../utils/programAssets";
import {
  DAY_FULL_ID,
  DAY_SHORT_ID,
  getMinutesToProgram,
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
  const announcersQuery = useAnnouncers();
  const { toggle } = usePlayerControls();
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

  const loading = !program && remote.isLoading;
  const isError = remote.isError;
  const onAir = program ? isOnAirNow(program, now) : false;
  const isPlaying = playerStatus === "playing";
  const isBuffering = playerStatus === "buffering";
  const minsTo = program ? getMinutesToProgram(program, now) : 0;
  const countdown = program && !onAir ? formatCountdown(minsTo) : null;
  const isScheduled = program ? Boolean(reminders[program.id]) : false;
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
    <Screen scroll dockInset="dock" contentStyle={{ paddingHorizontal: 0 }}>
      <View className="absolute left-4 right-4 top-1 z-10 flex-row items-center justify-between">
        <Pressable
          onPress={handleCustomBack}
          accessibilityRole="button"
          accessibilityLabel="Kembali"
          className="h-11 w-11 items-center justify-center rounded-full bg-surface-lowest/80 backdrop-blur-md active:opacity-80"
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>

        {program ? (
          <Pressable
            onPress={() => handleRemind(program)}
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
          <View className="relative aspect-[16/10] w-full bg-surface-3">
            <Image
              source={getProgramArtwork(program.name, program.cover_url)}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              transition={280}
            />
            <View className="absolute inset-x-0 bottom-0 h-3/5 bg-black/55" />
            <View className="absolute inset-x-0 bottom-0 h-1/3 bg-black/30" />

            <View className="absolute inset-x-0 bottom-0 gap-2 p-4">
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
                className="text-[24px] font-extrabold leading-8 tracking-tight text-white"
                numberOfLines={2}
                style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
              >
                {program.name}
              </Text>
            </View>
          </View>

          {/* Hosts — Gaul Squad (7 Penyiar Gaul FM 87.8 Semarang) */}
          <View className="px-5 pt-4">
            <View className="flex-row items-center justify-between">
              <Text
                className="text-[10px] font-bold uppercase tracking-widest text-text-dim"
                style={{ fontFamily: "PlusJakartaSans_700Bold" }}
              >
                Penyiar Program Ini
              </Text>
            </View>

            <View className="mt-3 flex-row flex-wrap gap-3">
              {(() => {
                const allAnnouncers = announcersQuery.data && announcersQuery.data.length > 0
                  ? announcersQuery.data
                  : [];
                const matched = allAnnouncers.filter((ann) => {
                  if (!ann.programs || ann.programs.length === 0) return false;
                  const progNorm = program.name.toLowerCase();
                  return ann.programs.some((pName) => {
                    const pNorm = pName.toLowerCase();
                    return progNorm.includes(pNorm) || pNorm.includes(progNorm);
                  });
                });
                const list = matched.length > 0 ? matched : allAnnouncers;

                return list.map((item) => {
                  const isOnAirNow =
                    onAir && Boolean(isHostOnAir(item.name, nowPlaying.current_host));

                  return (
                    <View key={item.id} className="w-16 items-center">
                      <View
                        className={`relative h-14 w-14 items-center justify-center rounded-full p-0.5 ${
                          isOnAirNow ? "bg-live" : "border-2 border-brand/40"
                        }`}
                        style={isOnAirNow ? { elevation: 3 } : undefined}
                      >
                        <View className="h-full w-full overflow-hidden rounded-full bg-surface-3">
                          {item.photo_url ? (
                            <Image
                              source={{ uri: item.photo_url }}
                              style={{ width: "100%", height: "100%" }}
                              contentFit="cover"
                              contentPosition="center"
                              transition={200}
                            />
                          ) : (
                            <View className="h-full w-full items-center justify-center">
                              <Ionicons name="mic" size={18} color={colors.brand} />
                            </View>
                          )}
                        </View>

                      {isOnAirNow ? (
                        <View className="absolute -bottom-1 rounded-full bg-live px-1 py-0.2">
                          <Text
                            className="text-[7px] font-extrabold uppercase text-white"
                            style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
                          >
                            LIVE
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <Text
                      className="mt-1.5 text-center text-[11px] font-semibold text-text"
                      numberOfLines={1}
                      style={{ fontFamily: "PlusJakartaSans_600SemiBold" }}
                    >
                      {item.name}
                    </Text>
                  </View>
                );
              });
            })()}
            </View>

            <View className="mt-4 flex-row gap-2">
              <View className="min-w-0 flex-1 flex-row items-center gap-2.5 rounded-card bg-surface p-3.5">
                <View className="h-10 w-10 items-center justify-center rounded-md bg-orange/12">
                  <Ionicons
                    name="time-outline"
                    size={18}
                    color={colors.orange}
                  />
                </View>
                <View className="min-w-0 flex-1">
                  <Text
                    className="text-[10px] font-bold uppercase tracking-widest text-text-dim"
                    style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                  >
                    Slot ini
                  </Text>
                  <Text
                    className="mt-0.5 text-sm font-semibold text-text"
                    numberOfLines={1}
                    style={{ fontFamily: "PlusJakartaSans_600SemiBold" }}
                  >
                    {DAY_SHORT_ID[program.day_of_week]} · {program.start_time}–
                    {program.end_time} WIB
                  </Text>
                </View>
              </View>
            </View>

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

            {/* Weekly slots */}
            <View className="mt-6 flex-row items-center gap-2">
              <View className="h-4 w-1 rounded-full bg-brand" />
              <Text
                className="text-[13px] font-bold uppercase tracking-widest text-text-dim"
                style={{ fontFamily: "PlusJakartaSans_700Bold" }}
              >
                Jadwal minggu ini
              </Text>
            </View>

            <View className="mt-3 gap-2">
              {(weekSlots.data ?? []).map((slot) => {
                const slotOnAir = isOnAirNow(slot);
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
                          {DAY_FULL_ID[slot.day_of_week]}
                        </Text>
                      )}
                    </View>
                    {!slotOnAir ? (
                      <Pressable
                        onPress={() => void handleRemind(slot)}
                        disabled={slotScheduled}
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
            </View>
          </View>

          {/* Sticky-feel CTA at end of scroll */}
          <View className="mt-6 border-t border-line/30 px-5 pb-2 pt-4">
            {onAir ? (
              <Pressable
                onPress={listenLive}
                accessibilityRole="button"
                accessibilityLabel={
                  isPlaying || isBuffering
                    ? "Jeda siaran"
                    : "Dengarkan siaran langsung"
                }
                className="min-h-12 flex-row items-center justify-center gap-2 rounded-md bg-orange active:opacity-90"
                style={glow.orange}
              >
                <Ionicons
                  name={isPlaying || isBuffering ? "pause" : "play"}
                  size={18}
                  color="#FFFFFF"
                />
                <Text
                  className="text-base font-extrabold text-white"
                  style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
                >
                  {isPlaying || isBuffering ? "Jeda siaran" : "Dengarkan Live"}
                </Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => void handleRemind(program)}
                disabled={isScheduled}
                accessibilityRole="button"
                accessibilityLabel={
                  isScheduled ? "Pengingat sudah aktif" : "Ingatkan saya"
                }
                className={`min-h-12 flex-row items-center justify-center gap-2 rounded-md border active:opacity-90 ${
                  isScheduled
                    ? "border-line/50 bg-surface-2"
                    : "border-brand/45 bg-brand/10"
                }`}
              >
                <Ionicons
                  name={isScheduled ? "checkmark-circle" : "notifications"}
                  size={18}
                  color={isScheduled ? colors.textDim : colors.brand}
                />
                <Text
                  className={`text-base font-extrabold ${
                    isScheduled ? "text-text-dim" : "text-brand"
                  }`}
                  style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
                >
                  {isScheduled ? "Pengingat aktif" : "Ingatkan saya"}
                </Text>
              </Pressable>
            )}
          </View>

          <View className="h-4" />
        </View>
      )}
    </Screen>
  );
}
