import React, { useEffect, useState } from "react";
import { AccessibilityInfo, Text, View, type TextProps } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, withDelay, cancelAnimation } from "react-native-reanimated";

interface MarqueeTextProps extends Omit<TextProps, "numberOfLines" | "children"> {
  children: string;
  /** Scroll speed in px/sec. */
  speed?: number;
  className?: string;
}

/**
 * Auto-scrolls horizontally when the text overflows its container; falls back
 * to plain ellipsis truncation under reduced motion (plan §2.6 PRD: "judul
 * acara berjalan"). One line, measures via onTextLayout.
 */
export function MarqueeText({
  children,
  speed = 30,
  className,
  ...rest
}: MarqueeTextProps) {
  const [containerW, setContainerW] = useState(0);
  const [textW, setTextW] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const translateX = useSharedValue(0);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const overflow = textW > containerW && containerW > 0;

  useEffect(() => {
    if (!overflow || reduceMotion) {
      cancelAnimation(translateX);
      translateX.value = 0;
      return;
    }
    const distance = textW - containerW + 16;
    const duration = Math.max((distance / speed) * 1000, 1500);
    
    translateX.value = withRepeat(
      withSequence(
        withDelay(1000, withTiming(-distance, { duration })),
        withDelay(1000, withTiming(0, { duration: 0 }))
      ),
      -1,
      false
    );
    return () => cancelAnimation(translateX);
  }, [overflow, reduceMotion, textW, containerW, speed]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View
      onLayout={(e) => setContainerW(e.nativeEvent.layout.width)}
      style={{ overflow: "hidden" }}
    >
      {React.createElement(Animated.View, {
        style: overflow && !reduceMotion ? animatedStyle : undefined
      }, 
        <Text
          className={className}
          numberOfLines={1}
          onTextLayout={(e) => setTextW(e.nativeEvent.lines[0]?.width ?? 0)}
          {...rest}
        >
          {children}
        </Text>
      )}
    </View>
  );
}
