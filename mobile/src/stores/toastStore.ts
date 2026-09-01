import { create } from "zustand";

/**
 * Lightweight in-app toast — replaces native Alert for soft confirmations.
 *
 * Importers/callers:
 * - ScheduleScreen.handleRemind
 * - ProgramDetail.handleRemindMe
 * - ToastHost
 *
 * API: showToast(message, tone?), useToastStore.show/hide
 * Schema: none (ephemeral UI state)
 * User: "fix ui notif diaktifkan nya tidak hilang"
 */

export type ToastTone = "success" | "info" | "error";

interface ToastState {
  visible: boolean;
  message: string;
  tone: ToastTone;
  token: number;
  show: (message: string, tone?: ToastTone) => void;
  hide: () => void;
  /** Clear text after fade-out so host can unmount. */
  clear: () => void;
}

let hideTimer: ReturnType<typeof setTimeout> | null = null;
let clearTimer: ReturnType<typeof setTimeout> | null = null;

function clearTimers() {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
  if (clearTimer) {
    clearTimeout(clearTimer);
    clearTimer = null;
  }
}

export const useToastStore = create<ToastState>((set) => ({
  visible: false,
  message: "",
  tone: "info",
  token: 0,

  show: (message, tone = "info") => {
    clearTimers();
    set({
      visible: true,
      message,
      tone,
      token: Date.now(),
    });
    // Auto-hide after 2.4s; clear text shortly after for unmount.
    hideTimer = setTimeout(() => {
      set({ visible: false });
      hideTimer = null;
      clearTimer = setTimeout(() => {
        set({ message: "" });
        clearTimer = null;
      }, 220);
    }, 2400);
  },

  hide: () => {
    clearTimers();
    set({ visible: false });
    clearTimer = setTimeout(() => {
      set({ message: "" });
      clearTimer = null;
    }, 220);
  },

  clear: () => {
    clearTimers();
    set({ visible: false, message: "" });
  },
}));

export function showToast(message: string, tone: ToastTone = "info"): void {
  useToastStore.getState().show(message, tone);
}
