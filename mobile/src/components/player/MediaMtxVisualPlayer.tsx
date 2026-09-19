import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Pressable, Text, View } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import * as ScreenOrientation from "expo-screen-orientation";
import { setAudioModeAsync } from "expo-audio";
import { VISUAL_WHEP_URL, VISUAL_HLS_URL } from "../../services/visualStream";
import { getVisualPlayerHtml } from "../../services/visualPlayerHtml";
import { stopLive } from "../../services/audio/trackPlayerService";

interface MediaMtxVisualPlayerProps {
  whepUrl?: string;
  hlsUrl?: string;
  onCloseVisual?: () => void;
}

export function MediaMtxVisualPlayer({
  whepUrl = VISUAL_WHEP_URL,
  hlsUrl = VISUAL_HLS_URL,
  onCloseVisual,
}: MediaMtxVisualPlayerProps) {
  const webViewRef = useRef<WebView>(null);
  const [foreground, setForeground] = useState(AppState.currentState !== "background");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  const mounted = useRef(true);
  const source = useMemo(() => ({
    html: getVisualPlayerHtml(whepUrl, hlsUrl),
    baseUrl: hlsUrl.slice(0, hlsUrl.lastIndexOf("/") + 1),
  }), [whepUrl, hlsUrl]);

  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    void (async () => {
      try {
        // Mount video only once the Icecast engine has released its audio.
        await stopLive();
        if (cancelled) return;
        await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true,
          interruptionMode: "duckOthers" }).catch(() => {});
        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    const subscription = AppState.addEventListener("change", state => {
      setForeground(state === "active");
      if (state !== "active") {
        webViewRef.current?.injectJavaScript("window.__cleanupVisualPlayer?.(); true;");
      }
    });
    return () => {
      cancelled = true;
      mounted.current = false;
      subscription.remove();
      void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, [reload]);

  // Callback ref runs before native view detaches; passive cleanup can be too late.
  const attachWebView = useCallback((view: WebView | null) => {
    if (!view) {
      try { webViewRef.current?.injectJavaScript("window.__cleanupVisualPlayer?.(); true;"); } catch {}
    }
    webViewRef.current = view;
  }, []);
  const handleMessage = async (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (mounted.current && data.event === "fullscreen_toggled") {
        await ScreenOrientation.lockAsync(data.isFullscreen
          ? ScreenOrientation.OrientationLock.LANDSCAPE
          : ScreenOrientation.OrientationLock.PORTRAIT_UP);
        if (!mounted.current) await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      }
    } catch {}
  };

  return (
    <View className="relative w-full bg-black overflow-hidden" style={{ width: "100%", aspectRatio: 16 / 9 }}>
      {ready && foreground && !error && <WebView
        key={reload}
        ref={attachWebView}
        source={source}
        style={{ width: "100%", height: "100%", backgroundColor: "#000000" }}
        allowsInlineMediaPlayback allowsFullscreenVideo mixedContentMode="always"
        mediaPlaybackRequiresUserAction={false} javaScriptEnabled domStorageEnabled
        androidLayerType="hardware" setSupportMultipleWindows={false} originWhitelist={["*"]}
        scrollEnabled={false} showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false}
        bounces={false} overScrollMode="never" onMessage={handleMessage}
        onError={() => setError(true)}
        onContentProcessDidTerminate={() => setReload(value => value + 1)}
        onRenderProcessGone={() => setReload(value => value + 1)}
      />}
      {error && <View className="absolute inset-0 items-center justify-center gap-3 p-4">
        <Text className="text-white">Video belum dapat diputar.</Text>
        <Pressable onPress={() => { setError(false); setReady(false); setReload(value => value + 1); }}>
          <Text className="text-white">Coba lagi</Text>
        </Pressable>
        {onCloseVisual && <Pressable onPress={onCloseVisual}><Text className="text-white">Dengarkan audio</Text></Pressable>}
      </View>}
    </View>
  );
}
