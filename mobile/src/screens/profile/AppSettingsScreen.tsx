import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Pressable,
  Switch,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { ProfileStackParamList } from "../../types";
import { useThemeStore } from "../../stores/themeStore";
import { useAuthStore } from "../../stores/authStore";
import { useNotificationPreferenceStore } from "../../stores/notificationPreferenceStore";
import { getSupabase } from "../../services/supabase";
import {
  disableNotifications,
  enableNotifications,
  getNotificationPermissionStatus,
  openNotificationSystemSettings,
  type NotificationPermissionStatus,
} from "../../services/notifications";
import { Screen } from "../../components/ui/Screen";
import { Card } from "../../components/ui/Card";
import { ThemeModePicker } from "../../components/ui/ThemeModePicker";

function SectionHeader({ title }: { title: string }) {
  return (
    <Text className="mb-2 mt-6 px-1 text-xs font-bold uppercase tracking-widest text-text-dim">
      {title}
    </Text>
  );
}

function permissionHint(status: NotificationPermissionStatus): string {
  switch (status) {
    case "granted":
      return "Notifikasi aktif";
    case "denied":
      return "Izin ditolak di sistem";
    case "unavailable":
      return "Tidak didukung di lingkungan ini";
    default:
      return "Belum diizinkan";
  }
}

export function AppSettingsScreen() {
  const colors = useThemeStore((s) => s.colors);
  const navigation =
    useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const enabled = useNotificationPreferenceStore((s) => s.enabled);
  const hydrated = useNotificationPreferenceStore((s) => s.hydrated);
  const profile = useAuthStore((s) => s.profile);

  const [perm, setPerm] =
    useState<NotificationPermissionStatus>("undetermined");
  const [busy, setBusy] = useState(false);

  const refreshPerm = useCallback(async () => {
    const s = await getNotificationPermissionStatus();
    setPerm(s);
  }, []);

  useEffect(() => {
    void refreshPerm();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshPerm();
    });
    return () => sub.remove();
  }, [refreshPerm]);

  useFocusEffect(
    useCallback(() => {
      void refreshPerm();
    }, [refreshPerm]),
  );

  const syncPushTokenToBackend = async (token: string | null) => {
    const userId = profile?.id;
    const supabase = getSupabase();
    if (!userId || !supabase) return;
    await supabase.from("profiles").update({ push_token: token }).eq("id", userId);
  };

  const onToggle = async (next: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      if (!next) {
        await disableNotifications();
        await syncPushTokenToBackend(null);
        await refreshPerm();
        return;
      }
      if (perm === "unavailable") {
        Alert.alert(
          "Notifikasi tidak tersedia",
          "Gunakan development build di perangkat fisik untuk mengaktifkan notifikasi.",
        );
        return;
      }
      if (perm === "denied") {
        Alert.alert(
          "Izin notifikasi dimatikan",
          "Aktifkan notifikasi Gaul FM di pengaturan sistem perangkat.",
          [
            { text: "Batal", style: "cancel" },
            {
              text: "Buka pengaturan",
              onPress: () => void openNotificationSystemSettings(),
            },
          ],
        );
        return;
      }
      const result = await enableNotifications();
      if (result.ok && result.token) {
        await syncPushTokenToBackend(result.token);
      }
      await refreshPerm();
      if (!result.ok && result.status === "denied") {
        Alert.alert(
          "Izin ditolak",
          "Tanpa izin, pengingat program tidak bisa dikirim. Kamu bisa mengubahnya di pengaturan sistem.",
          [
            { text: "OK", style: "cancel" },
            {
              text: "Buka pengaturan",
              onPress: () => void openNotificationSystemSettings(),
            },
          ],
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const switchOn = hydrated && enabled && perm === "granted";

  return (
    <Screen scroll dockInset="dock">
      <View className="mt-1 flex-row items-center gap-3">
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Kembali"
          hitSlop={10}
          className="min-h-11 min-w-11 items-center justify-center rounded-full border border-line/60 bg-surface-2"
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text className="text-[22px] font-extrabold tracking-tight text-text">
          Pengaturan
        </Text>
      </View>

      <SectionHeader title="Tampilan" />
      <Card>
        <Text className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-text-dim">
          Mode tema
        </Text>
        <ThemeModePicker />
        <Text className="mt-2.5 text-[11px] leading-4 text-text-dim">
          Pilih Gelap untuk studio hitam, Terang untuk mode siang, atau Sistem
          mengikuti perangkat.
        </Text>
      </Card>

      <SectionHeader title="Notifikasi" />
      <Card>
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-brand/10">
            <Ionicons
              name="notifications-outline"
              size={18}
              color={colors.brand}
            />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-sm font-semibold text-text">Notifikasi</Text>
            <Text className="mt-0.5 text-[11px] leading-4 text-text-dim">
              {permissionHint(perm)}
            </Text>
          </View>
          {busy ? (
            <ActivityIndicator color={colors.brand} />
          ) : (
            <Switch
              value={switchOn}
              onValueChange={(v) => void onToggle(v)}
              disabled={!hydrated || perm === "unavailable"}
              trackColor={{ false: colors.surface3, true: colors.brandDeep }}
              thumbColor={switchOn ? colors.brand : colors.textDim}
              accessibilityLabel="Aktifkan notifikasi"
            />
          )}
        </View>
        {perm === "denied" ? (
          <Pressable
            onPress={() => void openNotificationSystemSettings()}
            accessibilityRole="button"
            accessibilityLabel="Buka pengaturan sistem"
            className="mt-3 min-h-11 items-center justify-center rounded-md border-line/60 bg-surface-2 active:opacity-70"
          >
            <Text className="text-sm font-semibold text-brand">
              Buka pengaturan sistem
            </Text>
          </Pressable>
        ) : null}
      </Card>

      <Text className="mt-8 text-center text-[11px] text-text-dim">
        Gaul FM Semarang Mobile — v0.1.0 (MVP)
      </Text>
    </Screen>
  );
}
