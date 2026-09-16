import React from "react";
import { Pressable, Text, View } from "react-native";
import { DAY_FULL_ID, DAY_SHORT_ID, todayDow } from "../../utils/datetime";

interface DaySelectorProps {
  selected: number;
  onSelect: (day: number) => void;
  reduceMotion?: boolean;
}

/** Senin → Minggu. */
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

/**
 * Calm week strip — day names only, without extra date-number noise.
 * Selected = brand green; today = orange accent when not selected.
 */
export function DaySelector({
  selected,
  onSelect,
}: DaySelectorProps) {
  const today = todayDow();

  return (
    <View className="relative mx-4 flex-row items-center rounded-2xl bg-surface-2 p-1">
      {DISPLAY_ORDER.map((day) => {
        const isSelected = day === selected;
        const isToday = day === today;
        return (
          <Pressable
            key={day}
            onPress={() => onSelect(day)}
            accessibilityRole="button"
            accessibilityLabel={`Jadwal ${DAY_FULL_ID[day]}${isToday ? ", hari ini" : ""}`}
            accessibilityState={{ selected: isSelected }}
            className={`relative mx-0.5 h-10 flex-1 items-center justify-center rounded-xl active:opacity-75 ${
              isSelected
                ? "bg-brand shadow-sm shadow-brand/30"
                : "bg-transparent"
            }`}
          >
            <Text
              className={`text-[11px] font-extrabold uppercase tracking-wide ${
                isSelected ? "text-onbrand" : "text-text-dim"
              }`}
              style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
            >
              {DAY_SHORT_ID[day]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
