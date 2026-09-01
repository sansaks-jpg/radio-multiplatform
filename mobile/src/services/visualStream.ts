import Constants from "expo-constants";

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;

export const VISUAL_RTMP_URL: string =
  (extra.visualStreamRtmpUrl as string) ??
  "rtmp://40.81.231.250:1935/gaulfm_webrtc";

export const VISUAL_WHEP_URL: string =
  (extra.visualStreamWhepUrl as string) ??
  "http://40.81.231.250:8889/gaulfm_webrtc/whep";

export const VISUAL_HLS_URL: string =
  (extra.visualStreamHlsUrl as string) ??
  "http://40.81.231.250:8888/gaulfm_webrtc/index.m3u8";

export function getVisualStreamUrls() {
  return {
    rtmpUrl: VISUAL_RTMP_URL,
    whepUrl: VISUAL_WHEP_URL,
    hlsUrl: VISUAL_HLS_URL,
  };
}
