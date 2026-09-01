import { Platform } from "react-native";

export interface DeviceSummary {
  os: string;
  model: string;
}

/** OS + model captured at register/login and stored on the profile (PRD tracking). */
export async function getDeviceSummary(): Promise<DeviceSummary> {
  try {
    if (Platform.OS === "web") {
      return { os: "web", model: "browser" };
    }
    const Device = await import("expo-device");
    const model = Device.modelName ?? Device.deviceName ?? "Unknown";
    return { os: `${Platform.OS} ${String(Platform.Version)}`, model };
  } catch {
    return { os: Platform.OS, model: "Unknown" };
  }
}
