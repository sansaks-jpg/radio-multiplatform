import "react-native-url-polyfill/auto";
import { NativeModules, Platform } from "react-native";
import { registerRootComponent } from "expo";
import App from "./App";

// Register the react-native-track-player background service on native
// builds only. Expo Go does not ship the RNTP native module — guard the
// require so its Capability enum (which dereferences NativeModules) is
// never evaluated there, otherwise Metro throws at runtime.
if (Platform.OS !== "web") {
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
