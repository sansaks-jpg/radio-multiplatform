import React, { useEffect, useRef } from "react";
import { Animated, Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { useReducedMotion } from "../../hooks/useReducedMotion";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Subtle native-driver feedback without moving neighbouring content. */
export function MotionPressable({ style, onPressIn, onPressOut, ...props }: Omit<PressableProps, "style"> & { className?: string; style?: StyleProp<ViewStyle> }) {
  const scale = useRef(new Animated.Value(1)).current;
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced || props.disabled) { scale.stopAnimation(); scale.setValue(1); }
    return () => scale.stopAnimation();
  }, [reduced, props.disabled, scale]);
  const animate = (pressed: boolean) => {
    if (reduced || props.disabled) return;
    Animated.spring(scale, {
      toValue: pressed ? 0.97 : 1, stiffness: 420, damping: 28,
      mass: 0.7, useNativeDriver: true, isInteraction: false,
    }).start();
  };
  return <AnimatedPressable {...props}
    onPressIn={(event) => { animate(true); onPressIn?.(event); }}
    onPressOut={(event) => { animate(false); onPressOut?.(event); }}
    style={[style, { transform: [{ scale }] }]}
  />;
}
