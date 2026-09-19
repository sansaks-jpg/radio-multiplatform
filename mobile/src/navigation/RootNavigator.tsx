import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuthStore, isProfileComplete } from "../stores/authStore";
import { useOnboardingStore } from "../stores/onboardingStore";
import { useThemeStore } from "../stores/themeStore";
import { useNowPlaying } from "../hooks/useNowPlaying";
import type { RootStackParamList } from "../types";
import { SplashScreen } from "../screens/SplashScreen";
import { OnboardingScreen } from "../screens/OnboardingScreen";
import { CompleteProfileScreen } from "../screens/auth/CompleteProfileScreen";
import { AuthStack } from "./AuthStack";
import { MainTabs } from "./MainTabs";

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Root gate:
 * Splash (dynamic light/dark bg + brand logo) -> Onboarding on first launch ->
 * Auth stack for guests -> CompleteProfile if session exists but biodata is incomplete -> Main tabs.
 */
export function RootNavigator() {
  const initializing = useAuthStore((s) => s.initializing);
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const onboardingHydrated = useOnboardingStore((s) => s.hydrated);
  const hasSeenOnboarding = useOnboardingStore((s) => s.hasSeenOnboarding);
  const colors = useThemeStore((s) => s.colors);

  // Poll Now Playing app-wide so Home, Mini Player and lock-screen
  // metadata stay in sync wherever the user is.
  useNowPlaying();

  const showSplash = initializing || !onboardingHydrated;
  const needsProfileCompletion = Boolean(session && !isProfileComplete(profile));

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
      ) : !session ? (
        <Stack.Screen name="Auth" component={AuthStack} />
      ) : needsProfileCompletion ? (
        <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
      ) : (
        <Stack.Screen name="Main" component={MainTabs} />
      )}
    </Stack.Navigator>
  );
}
