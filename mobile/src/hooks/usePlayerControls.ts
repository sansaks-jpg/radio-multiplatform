import { useCallback } from "react";
import { usePlayerStore } from "../stores/playerStore";
import {
  pauseLive,
  playLive,
  retryLive,
} from "../services/audio/trackPlayerService";
import type { NowPlaying } from "../types";

export interface PlayerControls {
  play: () => Promise<void>;
  pause: () => Promise<void>;
  retry: () => Promise<void>;
  /** Convenience: toggle based on current status. */
  toggle: () => Promise<void>;
}

/** Transport actions wired to the global player store + track player service. */
export function usePlayerControls(): PlayerControls {
  const status = usePlayerStore((s) => s.status);
  const nowPlaying = usePlayerStore((s) => s.nowPlaying);

  const play = useCallback(
    async (override?: NowPlaying) => {
      const t0 = Date.now();
      try {
        await playLive(override ?? nowPlaying);
      } catch (err) {
        usePlayerStore
          .getState()
          .setError("Tidak dapat terhubung ke siaran");
        console.warn("[GaulFM] play failed:", err);
      } finally {
        console.log(`[GaulFM] TTFB play() = ${Date.now() - t0}ms`);
      }
    },
    [nowPlaying],
  );

  const pause = useCallback(async () => {
    try {
      await pauseLive();
    } catch (err) {
      console.warn("[GaulFM] pause failed:", err);
    }
  }, []);

  const retry = useCallback(async () => {
    try {
      await retryLive();
    } catch (err) {
      usePlayerStore.getState().setError("Tidak dapat terhubung ke siaran");
      console.warn("[GaulFM] retry failed:", err);
    }
  }, []);

  const toggle = useCallback(async () => {
    if (status === "playing" || status === "buffering") {
      await pause();
    } else {
      await play();
    }
  }, [status, pause, play]);

  return { play: () => play(), pause, retry, toggle };
}
