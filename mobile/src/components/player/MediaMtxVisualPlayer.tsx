import React from "react";
import { Pressable, View } from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import {
  VISUAL_RTMP_URL,
  VISUAL_WHEP_URL,
  VISUAL_HLS_URL,
} from "../../services/visualStream";

interface MediaMtxVisualPlayerProps {
  rtmpUrl?: string;
  whepUrl?: string;
  hlsUrl?: string;
  onCloseVisual?: () => void;
}

export function MediaMtxVisualPlayer({
  rtmpUrl = VISUAL_RTMP_URL,
  whepUrl = VISUAL_WHEP_URL,
  hlsUrl = VISUAL_HLS_URL,
  onCloseVisual,
}: MediaMtxVisualPlayerProps) {
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <script src="https://cdn.jsdelivr.net/npm/hls.js@1.5.7/dist/hls.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; background: #000; }
    html, body { width: 100%; height: 100%; overflow: hidden; display: flex; justify-content: center; align-items: center; }
    video { width: 100%; height: 100%; object-fit: contain; }
  </style>
</head>
<body>
  <video id="video" autoplay playsinline controls controlsList="nodownload"></video>

  <script>
    const whepUrl = "${whepUrl}";
    const hlsUrl = "${hlsUrl}";
    const video = document.getElementById('video');

    function playVideo() {
      video.play().catch(function() {
        video.muted = true;
        video.play().catch(function() {});
      });
    }

    async function startWhep() {
      try {
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        pc.addTransceiver('video', { direction: 'recvonly' });
        pc.addTransceiver('audio', { direction: 'recvonly' });

        pc.ontrack = (event) => {
          if (event.streams && event.streams[0]) {
            video.srcObject = event.streams[0];
            playVideo();
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        let res = await fetch(whepUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/sdp' },
          body: offer.sdp
        });

        if (!res.ok) {
          throw new Error('WHEP HTTP status ' + res.status);
        }

        const answerSdp = await res.text();
        await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
      } catch (e) {
        startHls();
      }
    }

    function startHls() {
      if (typeof Hls !== 'undefined' && Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        });
        hls.loadSource(hlsUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, function() {
          playVideo();
        });
      } else {
        video.src = hlsUrl;
        playVideo();
      }
    }

    startWhep();
  </script>
</body>
</html>
`;

  return (
    <View className="relative aspect-[16/9] w-full overflow-hidden bg-black">
      <WebView
        source={{ html: htmlContent, baseUrl: "http://40.81.231.250:8888/" }}
        style={{ width: "100%", height: "100%", backgroundColor: "#000000" }}
        allowsInlineMediaPlayback
        allowsFullscreenVideo
        mixedContentMode="always"
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={["*"]}
      />

      {onCloseVisual ? (
        <Pressable
          onPress={onCloseVisual}
          accessibilityRole="button"
          accessibilityLabel="Tutup siaran visual"
          className="absolute right-2.5 top-2.5 rounded-full bg-black/60 p-2 active:opacity-80 z-30"
        >
          <Ionicons name="close-circle" size={24} color="#FFFFFF" />
        </Pressable>
      ) : null}
    </View>
  );
}
