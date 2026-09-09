import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { spacing } from "../../theme/tokens";
import { useThemeStore } from "../../stores/themeStore";
import { useKeyboardInset } from "../../hooks/useKeyboardInset";

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  className?: string;
  contentStyle?: StyleProp<ViewStyle>;
  /** Optional ref to the inner ScrollView (scroll mode only) — for scrollTo. */
  scrollRef?: React.RefObject<ScrollView | null>;
  /**
   * Form mode: lift fields above keyboard.
   * iOS: KeyboardAvoidingView(padding) + automaticallyAdjustKeyboardInsets.
   * Android: pad ScrollView bottom by measured keyboard height
   * (also works if native resize not yet rebuilt).
   */
  keyboardAvoiding?: boolean;
  dockInset?: "tabs" | "dock" | "none";
  /** If false, removes 16px horizontal padding for full-bleed edge-to-edge elements (banners, maps, etc.) */
  padded?: boolean;
}

const DOCK_PAD: Record<NonNullable<ScreenProps["dockInset"]>, number> = {
  tabs: spacing.lg,
  dock: spacing.lg,
  none: spacing.xl,
};

/** Base screen: safe area + theme bg + optional 16px horizontal padding. */
export function Screen({
  children,
  scroll = false,
  refreshing = false,
  onRefresh,
  className = "",
  contentStyle,
  scrollRef,
  keyboardAvoiding = false,
  dockInset = "tabs",
  padded = true,
}: ScreenProps) {
  const colors = useThemeStore((s) => s.colors);
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardInset();
  const bottomPad = DOCK_PAD[dockInset];

  // Keyboard room — always applied LAST so contentStyle cannot wipe it.
  // Android: full keyboard height (Modal/forms often need this even with resize).
  // iOS: modest extra; KAV + auto insets do the heavy lift.
  const keyboardPad = keyboardAvoiding
    ? Platform.OS === "android"
      ? keyboardHeight > 0
        ? keyboardHeight + 12
        : 24
      : keyboardHeight > 0
        ? 24
        : 40
    : 0;

  const scrollContentStyle: StyleProp<ViewStyle> = [
    {
      paddingHorizontal: padded ? spacing.base : 0,
      paddingBottom: bottomPad + keyboardPad,
    },
    contentStyle,
    // Force keyboard padding after contentStyle merge.
    keyboardAvoiding
      ? { paddingBottom: bottomPad + keyboardPad }
      : null,
  ];

  const body = scroll ? (
    <ScrollView
      ref={scrollRef}
      className="flex-1"
      contentContainerStyle={scrollContentStyle}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      automaticallyAdjustKeyboardInsets={
        keyboardAvoiding && Platform.OS === "ios"
      }
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.brand}
            colors={[colors.brand]}
            progressBackgroundColor={colors.surface2}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    children
  );

  const content = scroll ? body : <>{children}</>;

  if (keyboardAvoiding && Platform.OS === "ios") {
    return (
      <SafeAreaView className={`flex-1 bg-bg ${className}`} edges={["top"]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior="padding"
          keyboardVerticalOffset={insets.top}
        >
          {content}
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={`flex-1 bg-bg ${className}`} edges={["top"]}>
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
