import React, { useEffect, useState } from "react";
import { AccessibilityInfo, Text, View } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, cancelAnimation } from "react-native-reanimated";
import { useThemeStore } from "../../stores/themeStore";

interface LiveBadgeProps {
  /** True while the stream is healthy (playing/buffering/ready). */
  active?: boolean;
  label?: string;
  size?: "sm" | "md";
}

/** Soft-pulsing red LIVE indicator; pulse disabled with reduced motion. */
export function LiveBadge({ active = true, label = "LIVE", size = "md" }: LiveBadgeProps) {
  const colors = useThemeStore((s) => s.colors);
  const scale = useSharedValue(1);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!active || reduceMotion) {
      cancelAnimation(scale);
      scale.value = 1;
      return;
    }
    scale.value = withRepeat(
      withSequence(
        withTiming(1.6, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1,
      false
    );
    return () => cancelAnimation(scale);
  }, [active, reduceMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const dotSize = size === "sm" ? 6 : 8;
  const dotColor = active ? colors.live : colors.textDim;

  return (
    <View
      className={`flex-row items-center gap-2 rounded-full border px-3 py-1 ${
        active ? "border-live/50 bg-live/15" : "border-line bg-surface-3"
      }`}
      accessibilityLabel={active ? "Siaran langsung" : "Siaran tidak aktif"}
    >
      {React.createElement(Animated.View, {
        style: [
          {
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: dotColor,
          },
          animatedStyle
        ]
      })}
      <Text
        className={`font-bold tracking-widest ${
          size === "sm" ? "text-[10px]" : "text-xs"
        } ${active ? "text-live" : "text-text-dim"}`}
      >
        {label}
      </Text>
    </View>
  );
}
