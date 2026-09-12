import { Image, Linking, Platform } from "react-native";
import Constants from "expo-constants";
import { useNotificationPreferenceStore } from "../stores/notificationPreferenceStore";

/**
 * Local + push notifications for Gaul FM.
 * Callers: App.tsx configureNotificationHandler; authStore registerPushToken;
 * ProgramDetail scheduleProgramReminder; AppSettingsScreen enable/disable.
 * API: enableNotifications, disableNotifications, getNotificationPermissionStatus,
 * openNotificationSystemSettings, scheduleProgramReminder, registerPushToken,
 * configureNotificationHandler, showLivePlaybackNotification, dismissLivePlaybackNotification.
 */

const isExpoGo = Constants.executionEnvironment === "storeClient";
const ANDROID_CHANNEL_ID = "gaulfm-default";

export type NotificationPermissionStatus =
  | "granted"
  | "denied"
  | "undetermined"
  | "unavailable";

function mapStatus(status: string | undefined): NotificationPermissionStatus {
  if (status === "granted") return "granted";
  if (status === "denied") return "denied";
  if (status === "undetermined") return "undetermined";
  return "unavailable";
}

export async function openNotificationSystemSettings(): Promise<void> {
  try {
    await Linking.openSettings();
  } catch (e) {
    console.warn("[GaulFM] openSettings failed:", e);
  }
}

async function ensureAndroidChannel(
  Notifications: typeof import("expo-notifications"),
): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: "Gaul FM",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#94F8AE",
  });
}

export async function getNotificationPermissionStatus(): Promise<NotificationPermissionStatus> {
  try {
    if (Platform.OS === "web") return "unavailable";
    const Notifications = await import("expo-notifications");
    const existing = await Notifications.getPermissionsAsync();
    return mapStatus(existing.status);
  } catch {
    return "unavailable";
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermissionStatus> {
  try {
    if (Platform.OS === "web") return "unavailable";
    const Notifications = await import("expo-notifications");
    await ensureAndroidChannel(Notifications);

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== "granted") {
      const requested = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      status = requested.status;
    }
    return mapStatus(status);
  } catch (e) {
    console.warn("[GaulFM] requestNotificationPermission:", e);
    return "unavailable";
  }
}

export async function enableNotifications(): Promise<{
  ok: boolean;
  status: NotificationPermissionStatus;
  token: string | null;
}> {
  const status = await requestNotificationPermission();
  if (status !== "granted") {
    await useNotificationPreferenceStore.getState().setEnabled(false);
    return { ok: false, status, token: null };
  }
  await useNotificationPreferenceStore.getState().setEnabled(true);
  const token = await registerPushToken();
  return { ok: true, status, token };
}

export async function disableNotifications(): Promise<void> {
  await useNotificationPreferenceStore.getState().setEnabled(false);
  try {
    if (Platform.OS === "web") return;
    const Notifications = await import("expo-notifications");
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    console.warn("[GaulFM] cancelAllScheduledNotificationsAsync:", e);
  }
}

/**
 * Importers: ScheduleScreen, ProgramDetail.
 * API: scheduleProgramReminder(name, minutes, coverUrl?)
 * Schema: local notification content; data.coverUrl optional string URL.
 * User: "di notifikasi nya juga tolong nanti tambhahkan foto programnya"
 */
export async function scheduleProgramReminder(
  programName: string,
  minutesFromNow: number,
  coverUrl?: string | null,
): Promise<string | null> {
  try {
    if (Platform.OS === "web") return null;
    if (!useNotificationPreferenceStore.getState().enabled) return null;

    const Notifications = await import("expo-notifications");
    await ensureAndroidChannel(Notifications);

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== "granted") {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== "granted") {
      console.warn("[GaulFM] notification permission denied for reminder");
      return null;
    }

    const cover =
      typeof coverUrl === "string" && coverUrl.trim().length > 0
        ? coverUrl.trim()
        : null;

    // Cover: iOS attachments; Android stores URL in data (+ richContent best-effort).
    // Local Android large-icon for remote URLs is limited in expo-notifications.
    const content: Record<string, unknown> = {
      title: "Gaul FM Semarang",
      body: `Program ${programName} akan segera dimulai!`,
      sound: true,
      color: "#94F8AE",
      data: {
        type: "program_reminder",
        programName,
        ...(cover ? { coverUrl: cover } : {}),
      },
    };

    if (cover) {
      if (Platform.OS === "ios") {
        content.attachments = [
          {
            identifier: "program-cover",
            url: cover,
            type: "public.image",
          },
        ];
      } else if (Platform.OS === "android") {
        // Best-effort: some Expo builds map richContent.image → large icon.
        content.richContent = { image: cover };
      }
    }

    const identifier = await Notifications.scheduleNotificationAsync({
      content: content as Parameters<
        typeof Notifications.scheduleNotificationAsync
      >[0]["content"],
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.floor(minutesFromNow * 60)),
        ...(Platform.OS === "android"
          ? { channelId: ANDROID_CHANNEL_ID }
          : {}),
      },
    });
    return identifier;
  } catch (error) {
    console.warn("[GaulFM] scheduleProgramReminder:", error);
    return null;
  }
}

export async function cancelProgramReminder(identifier: string): Promise<void> {
  try {
    if (Platform.OS === "web") return;
    const Notifications = await import("expo-notifications");
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch (e) {
    console.warn("[GaulFM] cancelProgramReminder:", e);
  }
}

export async function registerPushToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web" || isExpoGo) return null;
    if (!useNotificationPreferenceStore.getState().enabled) return null;

    const Notifications = await import("expo-notifications");
    const Device = await import("expo-device");
    if (!Device.isDevice) return null;

    await ensureAndroidChannel(Notifications);

    const existing = await Notifications.getPermissionsAsync();
    if (existing.status !== "granted") return null;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId;
    const token = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();
    return token.data ?? null;
  } catch {
    return null;
  }
}

export async function configureNotificationHandler(): Promise<void> {
  try {
    if (Platform.OS === "web") return;
    const Notifications = await import("expo-notifications");
    await ensureAndroidChannel(Notifications);
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  } catch {
    // Non-fatal.
  }
}

let livePlaybackNotificationId: string | null = null;

/**
 * Menampilkan notifikasi ongoing siaran live aktif di Android notification tray.
 * Tetap muncul saat aplikasi di-minimize/keluar, menampilkan cover/artwork program.
 */
export async function showLivePlaybackNotification(
  programName: string,
  host: string,
  coverArtwork?: any
): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const Notifications = await import("expo-notifications");
    await ensureAndroidChannel(Notifications);

    let coverUrl: string | undefined;
    if (coverArtwork) {
      if (typeof coverArtwork === "string") {
        coverUrl = coverArtwork;
      } else {
        try {
          const resolved = Image.resolveAssetSource(coverArtwork);
          coverUrl = resolved?.uri;
        } catch {
          // ignore
        }
      }
    }

    // Bersihkan notifikasi sebelumnya bila ada
    if (livePlaybackNotificationId) {
      await Notifications.dismissNotificationAsync(livePlaybackNotificationId).catch(() => {});
    }

    const content: Record<string, unknown> = {
      title: programName || "Gaul FM Semarang",
      body: `${host || "87.8 FM"} • On Air Sekarang`,
      sound: false,
      color: "#007A3E",
      priority: Notifications.AndroidNotificationPriority.HIGH,
      sticky: true,
      data: {
        type: "live_playback",
        programName: programName || "Gaul FM",
        ...(coverUrl ? { coverUrl } : {}),
      },
    };

    if (coverUrl) {
      if (Platform.OS === "ios") {
        content.attachments = [
          { identifier: "program-cover", url: coverUrl, type: "public.image" },
        ];
      } else if (Platform.OS === "android") {
        content.richContent = { image: coverUrl };
      }
    }

    livePlaybackNotificationId = await Notifications.scheduleNotificationAsync({
      content: content as any,
      trigger: null,
    });
  } catch (err) {
    console.warn("[GaulFM] showLivePlaybackNotification error:", err);
  }
}

/**
 * Menghilangkan notifikasi ongoing siaran saat audio dihentikan/pause.
 */
export async function dismissLivePlaybackNotification(): Promise<void> {
  if (Platform.OS === "web") return;
  if (!livePlaybackNotificationId) return;
  try {
    const Notifications = await import("expo-notifications");
    await Notifications.dismissNotificationAsync(livePlaybackNotificationId);
    livePlaybackNotificationId = null;
  } catch {
    // ignore
  }
}
