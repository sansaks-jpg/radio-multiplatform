import "./global.css";
import "react-native-gesture-handler";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import React, { useEffect, useState } from "react";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { ThemeRoot } from "./src/theme/ThemeRoot";
import { bootstrapApp } from "./src/services/bootstrap";
import { useRemoteEventHandlers } from "./src/hooks/useRemoteEventHandlers";

const DAY_MS = 24 * 3600 * 1000;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: DAY_MS,
      retry: 1,
    },
  },
});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
});

// Keep the native splash (light bg #F3F6F4 + brand logo, see app.config.ts) visible
// until the full bootstrap below has resolved — fonts, persisted stores,
// notification handler, and the audio engine.
void SplashScreen.preventAutoHideAsync().catch(() => undefined);
SplashScreen.setOptions({ duration: 220, fade: true });

export default function App() {
  useRemoteEventHandlers();

  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    let cancelled = false;
    bootstrapApp()
      .catch((err) => console.warn("[GaulFM] bootstrap:", err))
      .finally(() => {
        if (!cancelled) setBootstrapped(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (fontsLoaded && bootstrapped) {
      void SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded, bootstrapped]);

  // While fonts not loaded or bootstrap pending, native splash stays on top
  if (!fontsLoaded || !bootstrapped) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister: asyncStoragePersister,
            maxAge: DAY_MS,
            dehydrateOptions: {
              shouldDehydrateQuery: (query) => query.queryKey[0] === "news",
            },
          }}
        >
          <ThemeRoot />
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
