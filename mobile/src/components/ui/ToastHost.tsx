import React, { useEffect, useRef } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getAppBottomInset } from "../../utils/safeArea";
import { useThemeStore } from "../../stores/themeStore";
import { useToastStore, type ToastTone } from "../../stores/toastStore";

/**
 * Global toast host — Sonic Pulse surface.
 *
 * Importers: ThemeRoot.
 * API: none (reads toastStore).
 * User: "fix ui notif diaktifkan nya tidak hilang"
 *
 * Unmounts only after message is cleared (post fade-out).
 */

function toneIcon(tone: ToastTone): keyof typeof Ionicons.glyphMap {
  switch (tone) {
    case "success":
      return "checkmark-circle";
    case "error":
      return "alert-circle";
    default:
      return "information-circle";
  }
}

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const bottomInset = getAppBottomInset(insets);
  const colors = useThemeStore((s) => s.colors);
  const visible = useToastStore((s) => s.visible);
  const message = useToastStore((s) => s.message);
  const tone = useToastStore((s) => s.tone);
  const token = useToastStore((s) => s.token);
  const hide = useToastStore((s) => s.hide);

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    animRef.current?.stop();
    if (!message) {
      opacity.setValue(0);
      translateY.setValue(16);
      return;
    }

    if (visible) {
      opacity.setValue(0);
      translateY.setValue(16);
      animRef.current = Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]);
      animRef.current.start();
      return;
    }

    // Fade out — store clears `message` shortly after so we unmount.
    animRef.current = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 12,
        duration: 180,
        useNativeDriver: true,
      }),
    ]);
    animRef.current.start();
  }, [visible, token, message, opacity, translateY]);

  // Fully gone — do not leave an invisible pressable on screen.
  if (!message) return null;

  const iconColor =
    tone === "success"
      ? colors.brand
      : tone === "error"
        ? colors.live
        : colors.orange;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        bottom: Math.max(bottomInset, 12) + 72,
        zIndex: 9999,
        elevation: 24,
      }}
    >
      <Animated.View
        style={{ opacity, transform: [{ translateY }] }}
        pointerEvents={visible ? "auto" : "none"}
      >
        <Pressable
          onPress={hide}
          accessibilityRole="button"
          accessibilityLabel={message}
          accessibilityLiveRegion="polite"
          className="flex-row items-center gap-3 rounded-card border border-line/60 bg-surface-2 px-3.5 py-3 active:opacity-90"
        >
          <View className="h-9 w-9 items-center justify-center rounded-full bg-brand/10">
            <Ionicons name={toneIcon(tone)} size={18} color={iconColor} />
          </View>
          <Text
            className="min-w-0 flex-1 text-sm font-semibold leading-5 text-text"
            style={{ fontFamily: "PlusJakartaSans_600SemiBold" }}
          >
            {message}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}
