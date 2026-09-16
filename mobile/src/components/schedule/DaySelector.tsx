import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { useThemeStore } from "../../stores/themeStore";
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
  reduceMotion = false,
}: DaySelectorProps) {
  const colors = useThemeStore((s) => s.colors);
  const today = todayDow();
  const [width, setWidth] = useState(0);
  const selectedIndex = DISPLAY_ORDER.indexOf(selected as (typeof DISPLAY_ORDER)[number]);
  const indicatorX = useRef(new Animated.Value(0)).current;
  const hasPositionedIndicator = useRef(false);
  const itemWidth = width / DISPLAY_ORDER.length;

  useEffect(() => {
    if (itemWidth <= 0 || selectedIndex < 0) return;
    const nextX = selectedIndex * itemWidth;
    if (reduceMotion || !hasPositionedIndicator.current) {
      indicatorX.setValue(nextX);
      hasPositionedIndicator.current = true;
      return;
    }
    const animation = Animated.timing(indicatorX, {
      toValue: nextX,
      duration: 220,
      useNativeDriver: true,
      isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [indicatorX, itemWidth, reduceMotion, selectedIndex]);

  const handleLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  };

  return (
    <View className="relative mx-4 flex-row items-center rounded-2xl bg-surface-2" onLayout={handleLayout}>
      {itemWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 2,
            width: Math.max(0, itemWidth - 4),
            height: 44,
            borderRadius: 12,
            backgroundColor: colors.brand,
            transform: [{ translateX: indicatorX }],
          }}
        />
      ) : null}
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
            className={`relative mx-0.5 h-11 flex-1 items-center justify-center rounded-2xl border active:opacity-85 ${
              !isSelected && isToday
                ? "border-orange/30 bg-orange/10"
                : "border-transparent bg-transparent"
            }`}
          >
            <Text
              className={`text-[11px] font-extrabold uppercase tracking-wide ${
                isSelected
                  ? "text-onbrand"
                  : isToday
                    ? "text-orange"
                    : "text-text-dim"
              }`}
              style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
            >
              {DAY_SHORT_ID[day]}
            </Text>
            {isToday ? (
              <View
                className={`absolute bottom-1 h-1 w-1 rounded-full ${
                  isSelected ? "bg-onbrand" : "bg-orange"
                }`}
              />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
