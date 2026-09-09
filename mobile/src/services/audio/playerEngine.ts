import { NativeModules, Platform } from "react-native";
import type { PlayerEngine } from "./engineTypes";
import { engine as webEngine } from "./playerEngine.web";

import Constants from "expo-constants";

const isNative = Platform.OS !== "web";
const isExpoGo = Constants.appOwnership === "expo";
const hasRntp = !isExpoGo && Boolean(NativeModules.TrackPlayerModule?.setupPlayer);

export const engine: PlayerEngine = isNative
  ? hasRntp
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ? require("./playerEngine.rntp").engine
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    : require("./playerEngine.expoAudio").engine
  : webEngine;
