import type {
  EngineEvents,
  LiveTrackMeta,
  PlayerEngine,
} from "./engineTypes";

/**
 * Web fallback engine backed by a single HTMLAudioElement.
 * Lets `expo start --web` bundle and demo the UI; no background playback
 * or lock-screen integration here (that is what the dev build is for).
 */

let audio: HTMLAudioElement | null = null;
let hasStarted = false;
let currentTitle = "Gaul FM";

async function setup(events: EngineEvents = {}): Promise<void> {
  if (audio || typeof Audio === "undefined") return;
  audio = new Audio();
  audio.preload = "none";
  audio.addEventListener("playing", () => events.onStateChange?.("playing"));
  audio.addEventListener("waiting", () => {
    if (hasStarted) events.onStateChange?.("buffering");
  });
  audio.addEventListener("pause", () => {
    if (hasStarted) events.onStateChange?.("paused");
  });
  audio.addEventListener("error", () =>
    events.onStateChange?.("error", "Stream tidak dapat diputar di browser"),
  );
  audio.addEventListener("ended", () => events.onStateChange?.("idle"));
}

async function loadAndPlay(track: LiveTrackMeta): Promise<void> {
  if (!audio) return;
  hasStarted = true;
  currentTitle = track.title;
  audio.src = track.url;
  try {
    await audio.play();
  } catch (err) {
    // Browsers block autoplay without user gesture — surface as error state.
    throw err instanceof Error ? err : new Error(String(err));
  }
}

async function play(): Promise<void> {
  if (!audio) return;
  hasStarted = true;
  await audio.play();
}

async function pause(): Promise<void> {
  audio?.pause();
}

async function stop(): Promise<void> {
  if (audio) {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  }
  hasStarted = false;
}

async function updateMetadata(
  meta: Omit<LiveTrackMeta, "url">,
): Promise<void> {
  currentTitle = meta.title;
  if (typeof document !== "undefined") {
    document.title = `${meta.title} — Gaul FM`;
  }
  if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: meta.title,
        artist: meta.artist,
        album: "Gaul FM Semarang",
      });
    } catch {
      // Best-effort.
    }
  }
  void currentTitle;
}

export const engine: PlayerEngine = {
  setup,
  loadAndPlay,
  play,
  pause,
  stop,
  updateMetadata,
};
