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
  /** Menyimpan preferensi apakah siaran visual radio sedang aktif */
  isVisualActive: boolean;
  /** Mengontrol apakah modal siaran langsung / live chat sedang terbuka */
  liveSheetOpen: boolean;
  /** Menandakan apakah sheet dibuka langsung dalam mode fullscreen chat */
  initialChatFullscreen: boolean;
  /** Menandakan apakah audio harus otomatis berputar saat sheet dibuka */
  autoPlayAudio: boolean;
  openLiveSheet: (options?: {
    visual?: boolean;
    chatFullscreen?: boolean;
    autoPlay?: boolean;
  }) => void;
  closeLiveSheet: () => void;
  toggleVisual: () => void;
  setIsVisualActive: (isVisualActive: boolean) => void;
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
  isVisualActive: false,
  liveSheetOpen: false,
  initialChatFullscreen: false,
  autoPlayAudio: false,
  openLiveSheet: (options) =>
    set((state) => ({
      liveSheetOpen: true,
      isVisualActive:
        options?.visual !== undefined
          ? options.visual
          : options?.chatFullscreen
          ? false
          : state.isVisualActive,
      initialChatFullscreen: Boolean(options?.chatFullscreen),
      autoPlayAudio: Boolean(options?.autoPlay),
    })),
  closeLiveSheet: () =>
    set({
      liveSheetOpen: false,
      initialChatFullscreen: false,
      autoPlayAudio: false,
    }),
  toggleVisual: () =>
    set((state) => ({ isVisualActive: !state.isVisualActive })),
  setIsVisualActive: (isVisualActive) => set({ isVisualActive }),
  setStatus: (status) => set({ status, error: null }),
  setError: (message) => set({ status: "error", error: message }),
  setNowPlaying: (nowPlaying) => set({ nowPlaying }),
  markStarted: () => set({ hasStarted: true }),
  reset: () =>
    set({
      status: "idle",
      error: null,
      hasStarted: false,
      isVisualActive: false,
      liveSheetOpen: false,
      initialChatFullscreen: false,
      autoPlayAudio: false,
    }),
}));
