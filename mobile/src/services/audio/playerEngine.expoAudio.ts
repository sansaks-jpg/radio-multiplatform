import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioStatus,
} from "expo-audio";
import type {
  EngineEvents,
  LiveTrackMeta,
  PlayerEngine,
} from "./engineTypes";

/**
 * Expo Go / dev-build audio engine backed by expo-audio.
 * Used when RNTP's native module is unavailable (Expo Go) but the
 * platform is native. Supports live HTTP streams; background/lock-screen
 * are best-effort (Expo Go has limitations).
 */

let player: AudioPlayer | null = null;
let events: EngineEvents = {};
let setupDone = false;

function onStatusUpdate(status: AudioStatus): void {
  if (status.isBuffering) {
    events.onStateChange?.("buffering");
  } else if (status.playing) {
    events.onStateChange?.("playing");
  } else if (status.isLoaded) {
    events.onStateChange?.("paused");
  }
  if (status.playbackState === "error") {
    events.onStateChange?.("error", "Stream tidak dapat diputar");
  }
}

async function setup(ev: EngineEvents = {}): Promise<void> {
  events = ev;
  if (setupDone) return;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "duckOthers",
    });
  } catch {
    // Best-effort — playback still works without mode config.
  }
  setupDone = true;
}

async function loadAndPlay(track: LiveTrackMeta): Promise<void> {
  if (!player) {
    player = createAudioPlayer({ uri: track.url });
    player.addListener("playbackStatusUpdate", onStatusUpdate);
  } else {
    player.replace({ uri: track.url });
  }
  try {
    player.setActiveForLockScreen(true, {
      title: track.title,
      artist: track.artist,
      artworkUrl: track.artwork ?? undefined,
    });
  } catch {
    // Best-effort — lock screen metadata not critical in Expo Go.
  }
  player.play();
}

async function play(): Promise<void> {
  player?.play();
}

async function pause(): Promise<void> {
  player?.pause();
}

async function stop(): Promise<void> {
  if (player) {
    player.pause();
    player.replace(null);
  }
}

async function updateMetadata(
  meta: Omit<LiveTrackMeta, "url">,
): Promise<void> {
  if (player) {
    try {
      player.setActiveForLockScreen(true, {
        title: meta.title,
        artist: meta.artist,
        artworkUrl: meta.artwork ?? undefined,
      });
    } catch {
      // Best-effort — lock screen metadata not critical in Expo Go.
    }
  }
}

export const engine: PlayerEngine = {
  setup,
  loadAndPlay,
  play,
  pause,
  stop,
  updateMetadata,
};
