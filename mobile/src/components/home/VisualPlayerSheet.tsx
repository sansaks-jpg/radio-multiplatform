import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  Text,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeStore } from "../../stores/themeStore";
import { openYouTube, type YouTubeVisual } from "../../services/youtube";

interface VisualPlayerSheetProps {
  visible: boolean;
  visual: YouTubeVisual | null;
  onClose: () => void;
}

/**
 * Full-screen YouTube embed for visual radio (no native video server).
 * Uses react-native-webview + official YouTube embed player.
 *
 * Fix: Autoplay enabled, fullscreen via native button works,
 * landscape orientation supported on native fullscreen.
 */
export function VisualPlayerSheet({
  visible,
  visual,
  onClose,
}: VisualPlayerSheetProps) {
  const colors = useThemeStore((s) => s.colors);
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);

  if (!visual) return null;

  const isLive = visual.status === "live";
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: #000; overflow: hidden; }
    .wrap { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: #000; }
    iframe { width: 100%; height: 100%; border: 0; }
  </style>
</head>
<body>
  <div class="wrap">
    <iframe
      src="https://www.youtube.com/embed/${visual.videoId}?autoplay=1&playsinline=0&rel=0&modestbranding=1&controls=1&fs=1${isLive ? "&live=1" : ""}"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowfullscreen
      referrerpolicy="strict-origin-when-cross-origin"
    ></iframe>
  </div>
</body>
</html>`;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View className="flex-1 bg-black">
        {/* Chrome — minimal, dark */}
        <View
          className="flex-row items-center gap-3 px-3 py-2"
          style={{ paddingTop: insets.top + 8 }}
        >
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Tutup visual"
            hitSlop={10}
            className="h-11 w-11 items-center justify-center rounded-full bg-white/10"
          >
            <Ionicons name="chevron-down" size={22} color="#FFFFFF" />
          </Pressable>
          <View className="min-w-0 flex-1">
            <View className="flex-row items-center gap-2">
              {isLive ? (
                <View className="flex-row items-center gap-1 rounded-full bg-live/20 px-2 py-0.5">
                  <View
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 3,
                      backgroundColor: "#FF3B30",
                    }}
                  />
                  <Text
                    className="text-[9px] font-extrabold uppercase tracking-widest text-live"
                    style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
                  >
                    Live
                  </Text>
                </View>
              ) : null}
              <Text
                className="text-[11px] font-bold uppercase tracking-widest text-white/60"
                style={{ fontFamily: "PlusJakartaSans_700Bold" }}
              >
                Visual radio
              </Text>
            </View>
            <Text
              className="mt-0.5 text-sm font-bold text-white"
              numberOfLines={1}
              style={{ fontFamily: "PlusJakartaSans_700Bold" }}
            >
              {visual.title}
            </Text>
          </View>
          <Pressable
            onPress={() => void openYouTube("video", visual.videoId)}
            accessibilityRole="button"
            accessibilityLabel="Buka di app YouTube"
            hitSlop={8}
            className="h-11 w-11 items-center justify-center rounded-full bg-white/10"
          >
            <Ionicons name="logo-youtube" size={20} color="#FF0000" />
          </Pressable>
        </View>

        {/* Player — full width, no rounded corners for video */}
        <View className="flex-1 bg-black">
          {loading ? (
            <View className="absolute inset-0 z-10 items-center justify-center bg-black">
              <ActivityIndicator color="#FFFFFF" size="large" />
              <Text
                className="mt-3 text-xs text-white/60"
                style={{ fontFamily: "PlusJakartaSans_400Regular" }}
              >
                Memuat player YouTube…
              </Text>
            </View>
          ) : null}
          <WebView
            source={{
              html,
              baseUrl: "https://www.youtube.com",
            }}
            style={{ flex: 1, backgroundColor: "#000" }}
            allowsFullscreenVideo
            allowsInlineMediaPlayback={false}
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState={false}
            onLoadEnd={() => setLoading(false)}
            onLoadStart={() => setLoading(true)}
            // Android: hardware layer for video
            androidLayerType={
              Platform.OS === "android" ? "hardware" : undefined
            }
            setSupportMultipleWindows={false}
            originWhitelist={["*"]}
            // Allow fullscreen video
            allowsProtectedContent
          />
        </View>

        <Text
          className="px-4 py-3 text-center text-[11px] text-white/40"
          style={{
            fontFamily: "PlusJakartaSans_400Regular",
            paddingBottom: insets.bottom + 12,
          }}
        >
          Visual dari YouTube · audio radio tetap lewat player Gaul FM
        </Text>
      </View>
    </Modal>
  );
}
