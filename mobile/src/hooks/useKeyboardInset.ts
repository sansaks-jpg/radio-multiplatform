import { useEffect, useState } from "react";
import {
  Dimensions,
  Keyboard,
  Platform,
  type KeyboardEvent,
} from "react-native";

/**
 * Tinggi keyboard (px) saat terbuka, 0 saat tertutup.
 * iOS: willShow/willHide (sync animasi). Android: didShow/didHide.
 *
 * Edge-to-edge Android (SDK 54) often ignores adjustResize for the RN root.
 * Consumers must pad layouts with this value (see AuthFormLayout, LiveDetailSheet).
 *
 * Prefer endCoordinates.height; fall back to screenH - screenY when height is 0
 * (some OEM / edge-to-edge combos report a bad height).
 */
export function useKeyboardInset(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const readHeight = (e: KeyboardEvent) => {
      const end = e.endCoordinates;
      const raw = end?.height ?? 0;
      const screenH = Dimensions.get("screen").height;
      const fromY =
        typeof end?.screenY === "number" ? Math.max(0, screenH - end.screenY) : 0;
      const h = Math.max(raw, fromY);
      setHeight(Number.isFinite(h) && h > 0 ? Math.ceil(h) : 0);
    };

    const onShow = Keyboard.addListener(showEvent, readHeight);
    const onHide = Keyboard.addListener(hideEvent, () => setHeight(0));

    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  return height;
}
