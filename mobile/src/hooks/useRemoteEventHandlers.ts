import { useEffect } from "react";
import { AppState } from "react-native";
import { usePlayerStore } from "../stores/playerStore";

/**
 * Syncs Zustand player state when the app returns to foreground.
 *
 * Remote event handlers (RemotePlay/RemotePause/RemoteStop) live in the
 * Headless JS playback service (playbackService.rntp.ts), NOT here — the
 * main JS context may be suspended or unmounted when the app is backgrounded,
 * causing notification button presses to be silently lost.
 *
 * Zustand catch-up: on foreground, reads TrackPlayer.getPlaybackState() and
 * reconciles the store with current engine state.
 */
export function useRemoteEventHandlers(): void {
  const setStatus = usePlayerStore((s) => s.setStatus);

  useEffect(() => {
    const appSub = AppState.addEventListener("change", async (next) => {
      if (next !== "active") return;
      try {
        const TrackPlayer = require("react-native-track-player").default;
        const { State } = require("react-native-track-player");
        if (!TrackPlayer || typeof TrackPlayer.getPlaybackState !== "function") return;
        const result = await TrackPlayer.getPlaybackState();
        const state = result && typeof result === "object" && "state" in result ? result.state : result;
        if (state === State.Playing) {
          setStatus("playing");
        } else if (state === State.Paused || state === State.Stopped || state === State.Ready) {
          setStatus("paused");
        } else if (state === State.None || state === State.Ended) {
          setStatus("idle");
        } else if (state === State.Error) {
          setStatus("error");
        }
      } catch {
        // Best-effort for fallback engines / Expo Go.
      }
    });

    return () => {
      appSub.remove();
    };
  }, [setStatus]);
}
