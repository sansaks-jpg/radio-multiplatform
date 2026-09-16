import React, { useEffect, useRef } from "react";
import { Animated } from "react-native";
import { useReducedMotion } from "../../hooks/useReducedMotion";

/** Short content entrance; layout and scrolling remain under native control. */
export function Reveal({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduced) { progress.setValue(1); return; }
    progress.setValue(0);
    const animation = Animated.timing(progress, { toValue: 1, duration: 180, useNativeDriver: true, isInteraction: false });
    animation.start();
    return () => animation.stop();
  }, [progress, reduced]);
  return <Animated.View style={{ opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }] }}>{children}</Animated.View>;
}
