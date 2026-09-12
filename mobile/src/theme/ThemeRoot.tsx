import React, { useEffect, useMemo } from "react";
import {
  Appearance,
  AppState,
  StatusBar,
  View,
  useColorScheme,
} from "react-native";
import { vars } from "nativewind";
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from "@react-navigation/native";
import { getThemeChannels, useThemeStore } from "../stores/themeStore";
import { channelsToVars } from "./tokens";
import { RootNavigator } from "../navigation/RootNavigator";
import { ToastHost } from "../components/ui/ToastHost";

/**
 * Applies Sonic Pulse CSS vars + nav theme for light/dark.
 * Wraps the whole tree so NativeWind classNames re-tint with preference.
 *
 * Theme + notification-preference hydration runs in App.tsx `bootstrapApp()`
 * — ThemeRoot only subscribes to live system scheme changes.
 *
 * IMPORTANT: do NOT put key={preference/mode} on NavigationContainer —
 * remount resets the navigation state back to Home.
 */
export function ThemeRoot() {
  const mode = useThemeStore((s) => s.mode);
  const colors = useThemeStore((s) => s.colors);
  const setSystemScheme = useThemeStore((s) => s.setSystemScheme);
  const systemScheme = useColorScheme();

  // Sinkronisasi real-time via React Native useColorScheme hook
  useEffect(() => {
    if (systemScheme) {
      setSystemScheme(systemScheme);
    }
  }, [systemScheme, setSystemScheme]);

  // Sinkronisasi saat app kembali aktif dari Background / Pengaturan Sistem
  useEffect(() => {
    const subAppearance = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme);
    });
    const subAppState = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        setSystemScheme(Appearance.getColorScheme());
      }
    });
    return () => {
      subAppearance.remove();
      subAppState.remove();
    };
  }, [setSystemScheme]);

  const themeVars = useMemo(
    () => vars(channelsToVars(getThemeChannels(mode))),
    [mode],
  );

  const navTheme = useMemo(() => {
    const base = mode === "light" ? DefaultTheme : DarkTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: colors.bg,
        card: colors.surface,
        primary: colors.brand,
        text: colors.text,
        border: colors.line,
        notification: colors.live,
      },
    };
  }, [mode, colors]);

  return (
    <View style={[{ flex: 1, backgroundColor: colors.bg }, themeVars]}>
      <StatusBar
        barStyle={mode === "light" ? "dark-content" : "light-content"}
        backgroundColor={colors.bg}
      />
      {/* Stable container: theme updates via `theme` prop only — no remount. */}
      <NavigationContainer theme={navTheme}>
        <RootNavigator />
      </NavigationContainer>
      <ToastHost />
    </View>
  );
}
