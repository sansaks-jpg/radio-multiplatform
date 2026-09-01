import { Platform } from "react-native";

export interface LocationSnapshot {
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  permission: "granted" | "denied" | "unavailable";
}

const UNAVAILABLE: LocationSnapshot = {
  latitude: null,
  longitude: null,
  city: null,
  permission: "unavailable",
};

/**
 * One-shot foreground GPS capture (register flow) with reverse geocoding
 * for the city shown in Profile's transparency block.
 */
export async function captureLocationOnce(): Promise<LocationSnapshot> {
  try {
    if (Platform.OS === "web") return UNAVAILABLE;

    const Location = await import("expo-location");
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      return { ...UNAVAILABLE, permission: "denied" };
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const { latitude, longitude } = position.coords;

    let city: string | null = null;
    try {
      const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
      city = place?.city ?? place?.subregion ?? place?.region ?? null;
    } catch {
      // Reverse geocode is best-effort; city stays null ("pending").
    }

    return { latitude, longitude, city, permission: "granted" };
  } catch {
    return UNAVAILABLE;
  }
}
