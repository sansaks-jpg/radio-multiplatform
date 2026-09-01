import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuthStore } from "../stores/authStore";
import { useOnboardingStore } from "../stores/onboardingStore";
import { useThemeStore } from "../stores/themeStore";
import { useNowPlaying } from "../hooks/useNowPlaying";
import type { RootStackParamList } from "../types";
import { SplashScreen } from "../screens/SplashScreen";
import { OnboardingScreen } from "../screens/OnboardingScreen";
import { AuthStack } from "./AuthStack";
import { MainTabs } from "./MainTabs";

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Root gate (plan §1 navigation tree):
 * Splash (white bg + logo) as a safety net → Onboarding on first launch →
 * Auth stack for guests → Main tabs for authenticated users.
 *
 * All async init happens once in App.tsx `bootstrapApp()` behind the native
 * splash — by the time this navigator mounts, every store is hydrated.
 *
 * Logout / login transitions: `animation: "fade"` + dark `contentStyle`
 * background — when the conditional screens swap (Main ⇄ Auth), the frame
 * between unmount and mount fades through the app background instead of
 * flashing the native window.
 */
export function RootNavigator() {
  const initializing = useAuthStore((s) => s.initializing);
  const session = useAuthStore((s) => s.session);
  const onboardingHydrated = useOnboardingStore((s) => s.hydrated);
  const hasSeenOnboarding = useOnboardingStore((s) => s.hasSeenOnboarding);
  const colors = useThemeStore((s) => s.colors);

  // Poll Now Playing app-wide so Home, Mini Player and lock-screen
  // metadata stay in sync wherever the user is.
  useNowPlaying();

  // Safety net — should not normally render since App.tsx gates the tree,
  // but keeps the navigator resilient if store flags ever reset at runtime.
  const gating = initializing || !onboardingHydrated;

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "fade",
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      {gating ? (
        <Stack.Screen name="Splash" component={SplashScreen} />
      ) : !hasSeenOnboarding ? (
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      ) : session ? (
        <Stack.Screen name="Main" component={MainTabs} />
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}
    </Stack.Navigator>
  );
}
