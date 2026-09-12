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
 * Root gate:
 * Splash (dynamic light/dark bg + brand logo) -> Onboarding on first launch ->
 * Auth stack for guests -> Main tabs for authenticated users.
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

  const showSplash = initializing || !onboardingHydrated;

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "fade",
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      {showSplash ? (
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
