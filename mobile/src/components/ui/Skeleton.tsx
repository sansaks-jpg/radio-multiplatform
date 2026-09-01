import React from "react";
import { View, type ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from "react-native-reanimated";

interface SkeletonProps {
  className?: string;
  style?: ViewStyle;
}

/** Pulsing placeholder — surface-3, card radius. */
export function Skeleton({ className = "", style }: SkeletonProps) {
  const opacity = useSharedValue(0.45);

  React.useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700 }),
        withTiming(0.45, { duration: 700 }),
      ),
      -1,
      false,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return React.createElement(
    Animated.View,
    { style: [animatedStyle, style] },
    <View
      className={`rounded-card bg-surface-3 ${className || "h-4 w-full"}`}
    />,
  );
}
