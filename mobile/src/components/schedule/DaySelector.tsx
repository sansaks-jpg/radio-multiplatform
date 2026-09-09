import React, { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { DAY_SHORT_ID, todayDow } from "../../utils/datetime";

interface DaySelectorProps {
  selected: number;
  onSelect: (day: number) => void;
}

/** Senin → Minggu. */
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

function dateNumberForDow(day: number, base = new Date()): number {
  const wibTime = new Date(base.getTime() + 7 * 3600 * 1000);
  const baseDow = wibTime.getUTCDay(); // 0 = Sunday
  const baseMondayIndex = (baseDow + 6) % 7; // 0 = Monday, 6 = Sunday
  const targetMondayIndex = (day + 6) % 7;
  const diffDays = targetMondayIndex - baseMondayIndex;
  wibTime.setUTCDate(wibTime.getUTCDate() + diffDays);
  return wibTime.getUTCDate();
}

/**
 * Week strip — horizontal pills, easy to tap.
 * Selected = brand green; today = orange accent when not selected.
 */
export function DaySelector({ selected, onSelect }: DaySelectorProps) {
  const today = todayDow();
  const dates = useMemo(
    () => DISPLAY_ORDER.map((day) => dateNumberForDow(day)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [today],
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: 20,
        gap: 10,
        alignItems: "center",
      }}
    >
      {DISPLAY_ORDER.map((day, i) => {
        const isSelected = day === selected;
        const isToday = day === today;
        return (
          <Pressable
            key={day}
            onPress={() => onSelect(day)}
            accessibilityRole="button"
            accessibilityLabel={`Jadwal ${DAY_SHORT_ID[day]} tanggal ${dates[i]}`}
            accessibilityState={{ selected: isSelected }}
            className={`h-[82px] w-[60px] items-center justify-center rounded-[24px] active:opacity-85 border ${
              isSelected
                ? "bg-brand border-brand shadow-sm shadow-brand/40"
                : isToday
                  ? "bg-orange/10 border-orange/30"
                  : "bg-surface border-line/30"
            }`}
          >
            <Text
              className={`text-[11px] font-bold uppercase tracking-wide ${
                isSelected
                  ? "text-onbrand/90"
                  : isToday
                    ? "text-orange"
                    : "text-text-dim"
              }`}
              style={{ fontFamily: "PlusJakartaSans_700Bold" }}
            >
              {isToday ? "Ini" : DAY_SHORT_ID[day]}
            </Text>
            <Text
              className={`mt-1.5 text-[22px] font-extrabold ${
                isSelected
                  ? "text-onbrand"
                  : isToday
                    ? "text-orange"
                    : "text-text"
              }`}
              style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
            >
              {dates[i]}
            </Text>
            {isToday ? (
              <View
                className={`mt-2 h-1.5 w-1.5 rounded-full ${
                  isSelected ? "bg-onbrand" : "bg-orange"
                }`}
              />
            ) : (
              <View className="mt-2 h-1.5 w-1.5" />
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
