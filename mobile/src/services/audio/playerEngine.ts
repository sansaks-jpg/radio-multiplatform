import { NativeModules, Platform } from "react-native";
import type { PlayerEngine } from "./engineTypes";
import { engine as webEngine } from "./playerEngine.web";

const isNative = Platform.OS !== "web";
const hasRntp = Boolean(NativeModules.TrackPlayerModule);

export const engine: PlayerEngine = isNative
  ? hasRntp
    ? require("./playerEngine.rntp").engine
    : require("./playerEngine.expoAudio").engine
  : webEngine;
