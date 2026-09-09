import "react-native-url-polyfill/auto";
import { NativeModules, Platform } from "react-native";
import { registerRootComponent } from "expo";
import App from "./App";

// Register the react-native-track-player background service on native
// builds only (requires custom native development build).
// In Expo Go, NativeModules.TrackPlayerModule is null — guard so Metro does
// not evaluate Capability enum access or throw CAPABILITY_PLAY error.
import Constants from "expo-constants";

const isExpoGo = Constants.appOwnership === "expo";
const hasRntp =
  Platform.OS !== "web" && !isExpoGo && Boolean(NativeModules.TrackPlayerModule?.setupPlayer);

if (hasRntp) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const TrackPlayerModule = require("react-native-track-player");
    const TrackPlayer = TrackPlayerModule.default || TrackPlayerModule;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { playbackService } = require("./src/services/audio/playbackService.rntp");
    TrackPlayer.registerPlaybackService(() => playbackService);
  } catch (err) {
    console.warn("[GaulFM] playback service registration skipped:", err);
  }
}


registerRootComponent(App);
