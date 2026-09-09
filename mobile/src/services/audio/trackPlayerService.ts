import { engine } from "./playerEngine";
import { resolveStreamUrl } from "./streamResolver";
import { usePlayerStore } from "../../stores/playerStore";
import type { NowPlaying } from "../../types";

/**
 * Orchestrates the platform player engine for the Gaul FM live stream:
 * one-time setup, M3U resolution, single live track, state → Zustand sync.
 * UI code should always go through this service (see usePlayerControls),
 * never talk to the engine directly.
 */

let setupPromise: Promise<void> | null = null;
let resolvedUrl: string | null = null;
let currentOperationGeneration = 0;

async function ensureSetup(): Promise<void> {
  if (!setupPromise) {
    setupPromise = engine.setup({
      onStateChange: (state, error) => {
        const store = usePlayerStore.getState();
        if (state === "error") {
          store.setError(error ?? "Tidak dapat terhubung ke siaran");
        } else {
          store.setStatus(state);
        }
      },
    }).catch((err) => {
      // Clear setupPromise so future retries can re-attempt engine setup
      setupPromise = null;
      throw err;
    });
  }
  await setupPromise;
}

/** Start (or restart) the live stream with Now Playing metadata. */
export async function playLive(nowPlaying?: NowPlaying): Promise<void> {
  const generation = ++currentOperationGeneration;
  const store = usePlayerStore.getState();
  const np = nowPlaying ?? store.nowPlaying;

  // Set buffering state synchronously so UI & sheets immediately reflect active operation
  store.setStatus("buffering");
  store.markStarted();

  await ensureSetup();
  if (generation !== currentOperationGeneration) return;

  // Selalu resolve URL jika belum ada
  const startedAt = Date.now();
  if (!resolvedUrl) {
    const fetchedUrl = await resolveStreamUrl();
    if (generation !== currentOperationGeneration) return;
    resolvedUrl = fetchedUrl;
  }

  if (generation !== currentOperationGeneration) return;

  await engine.loadAndPlay({
    url: resolvedUrl,
    title: np.current_program,
    artist: np.current_host,
    artwork: np.current_cover_url,
  });
  console.log(`[GaulFM] live stream requested in ${Date.now() - startedAt}ms`);
}

/** Pause live stream. */
export async function pauseLive(): Promise<void> {
  currentOperationGeneration++;
  await ensureSetup();
  await engine.pause();
  resolvedUrl = null;
  usePlayerStore.getState().setStatus("paused");
}

export async function stopLive(): Promise<void> {
  currentOperationGeneration++;
  await ensureSetup();
  await engine.stop();
  resolvedUrl = null;
  usePlayerStore.getState().setStatus("paused");
}

/** Retry after an error: re-resolve the playlist and start over. */
export async function retryLive(): Promise<void> {
  currentOperationGeneration++;
  resolvedUrl = null;
  await engine.stop();
  await playLive();
}

/** Push Now Playing changes to the lock screen / media notification. */
export async function updateLiveMetadata(nowPlaying: NowPlaying): Promise<void> {
  try {
    await ensureSetup();
    await engine.updateMetadata({
      title: nowPlaying.current_program || "Gaul FM Semarang",
      artist: nowPlaying.current_host || "87.8 FM",
      artwork: nowPlaying.current_cover_url ?? null,
    });
  } catch (err) {
    console.warn("[GaulFM] Non-fatal error updating live metadata:", err);
  }
}

