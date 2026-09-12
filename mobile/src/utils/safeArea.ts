import { Dimensions, Platform, StatusBar } from "react-native";
import {
  useSafeAreaInsets,
  type EdgeInsets,
} from "react-native-safe-area-context";
import { dock, spacing } from "../theme/tokens";
import { usePlayerStore } from "../stores/playerStore";

/**
 * Tinggi default sistem bilah navigasi 3-tombol Android (Back, Home, Recents)
 * dalam satuan dp. Standar umum adalah 48dp.
 */
export const ANDROID_3BUTTON_NAV_BAR_HEIGHT = 48;

/**
 * Menghitung safe bottom inset yang tahan banting di seluruh platform (iOS, Web, Android).
 *
 * Pada Android:
 * - Menangani ponsel yang menggunakan bilah navigasi 3-tombol (Back, Home, Recents)
 *   di mana `insets.bottom` sering kali mengembalikan 0 (karena bug safe-area-context,
 *   edge-to-edge misconfiguration, atau vendor ROM).
 * - Menghitung selisih display screen vs window untuk mendeteksi tinggi bilah navigasi.
 * - Jika terdeteksi bilah navigasi atau jika `insets.bottom` adalah 0, memberikan
 *   fallback minimal 48dp agar Tab Bar, Live Chat Composer, dan konten bawah
 *   TIDAK PERNAH terpotong atau tertutup tombol navigasi sistem Android.
 * - Pada mode navigasi gestur (pill kecil / gesture navigation), jika `insets.bottom > 0`,
 *   akan menghormati nilai sistem yang dilaporkan (misal 16-24dp).
 */
export function getAppBottomInset(insets?: Partial<EdgeInsets> | null): number {
  const reportedBottom = insets?.bottom ?? 0;

  if (Platform.OS === "web") {
    return Math.max(reportedBottom, 8);
  }

  if (Platform.OS === "ios") {
    return reportedBottom;
  }

  // Android
  const screen = Dimensions.get("screen");
  const window = Dimensions.get("window");
  const statusBarHeight = StatusBar.currentHeight ?? 0;
  const rawDiff = Math.round(screen.height - window.height);

  let detectedNavHeight = 0;
  if (rawDiff > 0) {
    detectedNavHeight =
      rawDiff > statusBarHeight + 16 ? rawDiff - statusBarHeight : rawDiff;
  }

  // Jika sistem melaporkan bottom insets secara akurat (misal modern edge-to-edge / gesture bar)
  if (reportedBottom > 0) {
    return Math.max(reportedBottom, detectedNavHeight);
  }

  // Jika reportedBottom bernilai 0 namun terdeteksi selisih ukuran jendela navigasi
  if (detectedNavHeight >= 20) {
    return detectedNavHeight;
  }

  // Fallback pengaman Android 3-button navigation (48dp)
  return ANDROID_3BUTTON_NAV_BAR_HEIGHT;
}

/**
 * Hook reaktif untuk mendapatkan safe bottom inset aplikasi.
 */
export function useAppBottomInset(): number {
  const insets = useSafeAreaInsets();
  return getAppBottomInset(insets);
}

/**
 * Hook untuk menghitung padding bawah konten layar yang memperhitungkan:
 * - Tab Bar (56px)
 * - Safe bottom inset (misal 48px Android 3-tombol / 34px iOS Home Indicator)
 * - Mini Player aktif (64px jika hasStarted)
 * - Spacing bernapas (16px)
 */
export function useAppDockPad(
  dockInset: "tabs" | "dock" | "none" = "tabs",
): number {
  const insets = useSafeAreaInsets();
  const bottomInset = getAppBottomInset(insets);
  const hasStarted = usePlayerStore((s) => s.hasStarted);

  if (dockInset === "none") {
    return bottomInset + spacing.lg;
  }

  const miniPad = hasStarted ? dock.miniHeight : 0;
  return dock.tabBarHeight + bottomInset + miniPad + spacing.base;
}
