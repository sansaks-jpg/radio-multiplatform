/**
 * Shared contract for the platform player engines.
 * Metro resolves `./playerEngine` to playerEngine.ts on all platforms; that
 * file runtime-detects NativeModules.TrackPlayerModule and lazy-requires
 * playerEngine.rntp.ts only on real native builds (Expo Go falls back to
 * playerEngine.web.ts).
 */

export type EngineState = "idle" | "buffering" | "playing" | "paused" | "error";

export interface LiveTrackMeta {
  url: string;
  title: string;
  artist: string;
  artwork: string | null;
}

export interface EngineEvents {
  onStateChange?: (state: EngineState, error?: string) => void;
}

export interface PlayerEngine {
  /** Idempotent one-time engine setup with optional state callback. */
  setup(events?: EngineEvents): Promise<void>;
  /** Load the single live media item and start playback. */
  loadAndPlay(track: LiveTrackMeta): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  /** Full stop — tears the session down so the Mini Player hides. */
  stop(): Promise<void>;
  /** Update lock-screen / notification metadata for the live item. */
  updateMetadata(meta: Omit<LiveTrackMeta, "url">): Promise<void>;
}
