import { PermissionsAndroid, Platform, AppState } from "react-native";
import TrackPlayer, {
  Capability,
  Event,
  State,
  AppKilledPlaybackBehavior,
} from "react-native-track-player";
import type {
  EngineEvents,
  EngineState,
  LiveTrackMeta,
  PlayerEngine,
} from "./engineTypes";

const LIVE_TRACK_ID = "gaulfm-live";

let setupDone = false;
let engineEvents: EngineEvents = {};

function mapPlaybackState(state: State): EngineState {
  switch (state) {
    case State.Playing:
      return "playing";
    case State.Buffering:
    case State.Loading:
      return "buffering";
    case State.Paused:
    case State.Ready:
    case State.Stopped: // Map Stopped/paused to "paused" so the MiniPlayer stays visible with a Play button
      return "paused";
    case State.Error:
      return "error";
    case State.None:
    case State.Ended:
    default:
      return "idle";
  }
}

/**
 * Minta runtime permission POST_NOTIFICATIONS (Android 13 / API 33+).
 * RNTP membutuhkan permission ini agar media notification muncul.
 */
async function requestNotificationPermission(): Promise<void> {
  if (Platform.OS !== "android") return;
  // Jangan pernah minta permission saat berjalan di Headless JS (background)
  // karena bisa menyebabkan crash/hang!
  if (AppState.currentState !== "active") return;
  
  try {
    // API 33+ wajib runtime permission
    if (Platform.Version >= 33) {
      await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        {
          title: "Izin Notifikasi",
          message:
            "Gaul FM memerlukan izin notifikasi agar kontrol pemutar muncul di layar kunci dan status bar.",
          buttonPositive: "Izinkan",
          buttonNegative: "Tolak",
        },
      );
    }
  } catch {
    // Non-fatal — notifikasi tidak kritis untuk playback
  }
}

async function setup(events: EngineEvents = {}): Promise<void> {
  engineEvents = events;
  if (setupDone) return;

  // Minta permission notifikasi sebelum setupPlayer agar media notification
  // langsung muncul saat pertama kali play (Android 13+).
  await requestNotificationPermission();

  try {
    await TrackPlayer.setupPlayer({
      // Pause/duck automatically on calls, headphone unplug, audio focus loss.
      autoHandleInterruptions: true,
    });
  } catch (err: any) {
    // Ignore "already initialized" errors in Headless JS (background)
    if (!err?.message?.includes("already been initialized")) {
      console.warn("[GaulFM] RNTP setup error:", err);
    }
  }
  await TrackPlayer.updateOptions({
    android: {
      appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
    },
    capabilities: [Capability.Play, Capability.Pause, Capability.Stop],
    compactCapabilities: [Capability.Play, Capability.Pause],
    notificationCapabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.Stop,
    ],
  });
  TrackPlayer.addEventListener(Event.PlaybackState, (event: any) => {
    // Handle both { state: State } (v4) and raw State string safely to prevent destructuring bugs
    const rawState = event && typeof event === "object" && "state" in event ? event.state : event;
    console.log("[GaulFM] RNTP PlaybackState event:", rawState);
    const mapped = mapPlaybackState(rawState as State);
    console.log("[GaulFM] RNTP PlaybackState mapped to:", mapped);
    engineEvents.onStateChange?.(mapped);
  });
  TrackPlayer.addEventListener(Event.PlaybackError, ({ message }) => {
    console.log("[GaulFM] RNTP PlaybackError event:", message);
    engineEvents.onStateChange?.("error", message || "Stream tidak dapat diputar");
  });
  setupDone = true;
}


async function loadAndPlay(track: LiveTrackMeta): Promise<void> {
  // Always reset queue and add fresh track to guarantee new stream URL (failover / dynamic M3U)
  await TrackPlayer.reset();
  await TrackPlayer.add({
    id: LIVE_TRACK_ID,
    url: track.url,
    title: track.title,
    artist: track.artist,
    artwork: track.artwork ?? undefined,
    isLiveStream: true,
  });
  await TrackPlayer.play();

  // Poll as fallback for devices where Event.PlaybackState is delayed
  const t0 = Date.now();
  const poll = setInterval(async () => {
    try {
      const { state } = await TrackPlayer.getPlaybackState();
      if (state === State.Playing) {
        engineEvents.onStateChange?.("playing");
        clearInterval(poll);
      } else if (Date.now() - t0 > 10_000) {
        clearInterval(poll);
      }
    } catch {
      clearInterval(poll);
    }
  }, 500);
}

async function updateMetadata(meta: Omit<LiveTrackMeta, "url">): Promise<void> {
  try {
    // RNTP ≥ 4.0: refresh lock-screen / notification metadata in place.
    await TrackPlayer.updateNowPlayingMetadata({
      title: meta.title,
      artist: meta.artist,
      artwork: meta.artwork ?? undefined,
    });
  } catch {
    // Metadata refresh is best-effort; playback keeps running.
  }
}

export const engine: PlayerEngine = {
  setup,
  loadAndPlay,
  play: () => TrackPlayer.play(),
  // stop() closes the connection so the next play() reconnects fresh/live.
  // Manually fire onStateChange since Event.PlaybackState may not fire on this device.
  pause: async () => {
    await TrackPlayer.stop();
    engineEvents.onStateChange?.("paused");
  },
  stop: async () => {
    // Reset akan menghapus track dan dismiss notifikasi sepenuhnya (RemoteStop).
    await TrackPlayer.reset();
  },
  updateMetadata,
};
