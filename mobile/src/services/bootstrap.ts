import { useAuthStore } from "../stores/authStore";
import { useOnboardingStore } from "../stores/onboardingStore";
import { useThemeStore } from "../stores/themeStore";
import { useNotificationPreferenceStore } from "../stores/notificationPreferenceStore";
import { configureNotificationHandler } from "./notifications";
import { engine } from "./audio/playerEngine";
import { preloadAppAssets } from "./assets";

/**
 * App bootstrap — runs once at cold start, gated by the native splash.
 *
 * Every async resource the app needs before first paint is awaited here:
 * persisted theme, auth session, onboarding flag, notification prefs,
 * notification handler, and the audio engine setup. Runs in parallel where
 * possible so total startup time stays close to the slowest single task
 * instead of the sum of all tasks.
 *
 * Each step is individually fault-tolerant — a failing store hydrate must
 * never trap the user on the splash screen.
 */
export async function bootstrapApp(): Promise<void> {
  await Promise.all([
    // Assets — preload and decode all banners, logos, and onboarding artwork before splash hides.
    preloadAppAssets().catch((err) =>
      console.warn("[GaulFM] bootstrap assets:", err),
    ),

    // Theme — needs to resolve before first styled render.
    useThemeStore
      .getState()
      .hydrate()
      .catch((err) => console.warn("[GaulFM] bootstrap theme:", err)),

    // Auth — restore persisted Supabase / demo session.
    useAuthStore
      .getState()
      .restore()
      .catch((err) => console.warn("[GaulFM] bootstrap auth:", err)),

    // First-run onboarding flag.
    useOnboardingStore
      .getState()
      .hydrate()
      .catch((err) => console.warn("[GaulFM] bootstrap onboarding:", err)),

    // Notification preferences + handler config.
    useNotificationPreferenceStore
      .getState()
      .hydrate()
      .catch((err) => console.warn("[GaulFM] bootstrap notif prefs:", err)),
    configureNotificationHandler().catch((err) =>
      console.warn("[GaulFM] bootstrap notif handler:", err),
    ),

    // Audio engine — RNTP setupPlayer is idempotent and cheap; doing it at
    // boot means the first Play tap has zero setup latency.
    engine
      .setup()
      .catch((err) => console.warn("[GaulFM] bootstrap player engine:", err)),
  ]);
}
