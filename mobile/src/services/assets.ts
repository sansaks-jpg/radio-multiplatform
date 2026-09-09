import { Asset } from "expo-asset";
import { Image } from "expo-image";

/**
 * All static image assets bundled with the mobile app that should be
 * decoded and cached in memory before the splash screen is dismissed.
 */
export const PRELOAD_ASSETS = [
  require("../../assets/banners/banner-1.png"),
  require("../../assets/banners/banner-2.png"),
  require("../../assets/banners/banner-3.png"),
  require("../../assets/banners/banner-4.png"),
  require("../../assets/logo.webp"),
  require("../../assets/icon.png"),
  require("../../assets/adaptive-icon.png"),
  require("../../assets/cta-gradient.png"),
  require("../../assets/onboarding/slide-1.jpg"),
  require("../../assets/onboarding/slide-2.jpg"),
  require("../../assets/onboarding/slide-3.jpg"),
];

/**
 * App asset preloader — executed during bootstrapApp before splash screen hides.
 * 1. Ensures files are resolved via Asset.loadAsync.
 * 2. Pre-warms native image decode via Image.loadAsync so first paint has zero blank frames.
 */
export async function preloadAppAssets(): Promise<void> {
  try {
    await Asset.loadAsync(PRELOAD_ASSETS);
    await Promise.allSettled(
      PRELOAD_ASSETS.map((asset) => Image.loadAsync(asset)),
    );
  } catch (err) {
    console.warn("[GaulFM] Asset preloading warning:", err);
  }
}
