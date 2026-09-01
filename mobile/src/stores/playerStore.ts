import { create } from "zustand";
import type { NowPlaying, PlayerStatus } from "../types";
import { mockNowPlaying } from "../mocks/nowPlaying";

/**
 * Single source of truth for transport state + now-playing metadata
 * (plan §0: global player state lives in Zustand).
 */
interface PlayerStoreState {
  status: PlayerStatus;
  error: string | null;
  /** False until the user starts the stream for the first time — hides Mini Player. */
  hasStarted: boolean;
  nowPlaying: NowPlaying;
  setStatus: (status: PlayerStatus) => void;
  setError: (message: string) => void;
  setNowPlaying: (nowPlaying: NowPlaying) => void;
  markStarted: () => void;
  reset: () => void;
}

export const usePlayerStore = create<PlayerStoreState>((set) => ({
  status: "idle",
  error: null,
  hasStarted: false,
  nowPlaying: mockNowPlaying,
  setStatus: (status) => set({ status, error: null }),
  setError: (message) => set({ status: "error", error: message }),
  setNowPlaying: (nowPlaying) => set({ nowPlaying }),
  markStarted: () => set({ hasStarted: true }),
  reset: () => set({ status: "idle", error: null, hasStarted: false }),
}));
