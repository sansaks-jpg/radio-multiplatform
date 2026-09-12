import React, { useEffect, useRef } from "react";
import { Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useKeyboardInset } from "../../hooks/useKeyboardInset";
import { getAppBottomInset } from "../../utils/safeArea";

/**
 * Auth form keyboard layout (Login / Register / ForgotPassword).
 *
 * Edge-to-edge Android (SDK 54) breaks window adjustResize for the RN root —
 * same pattern as LiveDetailSheet: pad OUTER container with measured keyboard
 * height on BOTH platforms. No KeyboardAvoidingView (Expo 54 Android
 * sticky/double-shift bugs). contentContainerStyle pad alone only lengthens
 * content and fails when the viewport still sits under the IME.
 *
 * scrollToEnd when keyboard opens so Register lower fields stay reachable.
 */
interface AuthFormLayoutProps {
  children: React.ReactNode;
}

export function AuthFormLayout({ children }: AuthFormLayoutProps) {
  const keyboardHeight = useKeyboardInset();
  const keyboardOpen = keyboardHeight > 0;
  const insets = useSafeAreaInsets();
  const bottomInset = getAppBottomInset(insets);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!keyboardOpen) return;
    const id = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
    return () => clearTimeout(id);
  }, [keyboardOpen, keyboardHeight]);

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top,
          // True resize simulation under edge-to-edge (both platforms).
          paddingBottom: keyboardHeight,
        },
      ]}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: keyboardOpen ? 8 : 32,
            paddingBottom: Math.max(bottomInset, 16) + 24,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        showsVerticalScrollIndicator={false}
        bounces
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "transparent",
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },
});
