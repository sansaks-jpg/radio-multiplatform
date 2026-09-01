import TrackPlayer, { Event } from "react-native-track-player";
import { playLive, pauseLive, stopLive } from "./trackPlayerService";

/**
 * RNTP background playback service (Headless JS registration).
 *
 * Handles RemotePlay, RemotePause, and RemoteStop events for iOS control center,
 * Android notification buttons, and Bluetooth media keys.
 */
export async function playbackService(): Promise<void> {
  TrackPlayer.addEventListener(Event.RemotePlay, async () => {
    try {
      await playLive();
    } catch (err) {
      console.warn("[GaulFM] RemotePlay error:", err);
    }
  });

  TrackPlayer.addEventListener(Event.RemotePause, async () => {
    try {
      await pauseLive();
    } catch (err) {
      console.warn("[GaulFM] RemotePause error:", err);
    }
  });

  TrackPlayer.addEventListener(Event.RemoteStop, async () => {
    try {
      await stopLive();
    } catch (err) {
      console.warn("[GaulFM] RemoteStop error:", err);
    }
  });
}
