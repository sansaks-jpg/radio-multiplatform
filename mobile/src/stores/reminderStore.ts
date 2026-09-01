import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { scheduleProgramReminder, cancelProgramReminder } from "../services/notifications";

export interface ReminderItem {
  programId: string;
  programName: string;
  notificationId: string;
  scheduledAt: string;
}

interface ReminderStoreState {
  reminders: Record<string, ReminderItem>;
  addReminder: (
    programId: string,
    programName: string,
    minutesToStart: number,
    coverUrl?: string | null,
  ) => Promise<boolean>;
  removeReminder: (programId: string) => Promise<void>;
  isReminded: (programId: string) => boolean;
}

export const useReminderStore = create<ReminderStoreState>()(
  persist(
    (set, get) => ({
      reminders: {},
      addReminder: async (programId, programName, minutesToStart, coverUrl) => {
        const existing = get().reminders[programId];
        if (existing) {
          return true;
        }
        let remindMins = minutesToStart - 5;
        if (remindMins <= 0) remindMins = minutesToStart;
        if (remindMins <= 0) return false;

        const notificationId = await scheduleProgramReminder(
          programName,
          remindMins,
          coverUrl,
        );
        if (!notificationId) return false;

        set((state) => ({
          reminders: {
            ...state.reminders,
            [programId]: {
              programId,
              programName,
              notificationId,
              scheduledAt: new Date().toISOString(),
            },
          },
        }));
        return true;
      },
      removeReminder: async (programId) => {
        const existing = get().reminders[programId];
        if (existing) {
          await cancelProgramReminder(existing.notificationId);
          set((state) => {
            const next = { ...state.reminders };
            delete next[programId];
            return { reminders: next };
          });
        }
      },
      isReminded: (programId) => Boolean(get().reminders[programId]),
    }),
    {
      name: "gaulfm-reminders-v1",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
