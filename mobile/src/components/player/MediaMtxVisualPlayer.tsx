import React, { useEffect, useRef } from "react";
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
  const webViewRef = useRef<WebView>(null);

  // Jalankan pembersihan saat komponen di-unmount oleh React
  useEffect(() => {
    const webView = webViewRef.current;
    return () => {
      try {
        webView?.injectJavaScript(
          "if (typeof window.__cleanupVisualPlayer === 'function') { window.__cleanupVisualPlayer(); } true;"
        );
      } catch {
        // Safe unmount
      }
    };
  }, []);

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

    let pc = null;
    let hls = null;
    let whepSessionUrl = null;
    let currentStream = null;
    let isCleanedUp = false;
    let whepFallbackTimer = null;

    function playVideo() {
      if (isCleanedUp || !video) return;
      video.play().catch(function() {
        if (isCleanedUp || !video) return;
        video.muted = true;
        video.play().catch(function() {});
      });
    }

    // Fungsi pembersihan menyeluruh (WebRTC, HLS, Audio/Video Decoder, HTTP session)
    function cleanup() {
      if (isCleanedUp) return;
      isCleanedUp = true;

      if (whepFallbackTimer) {
        clearTimeout(whepFallbackTimer);
        whepFallbackTimer = null;
      }

      // 1. Hentikan elemen video & audio hardware context
      if (video) {
        try {
          video.pause();
          if (video.srcObject) {
            const stream = video.srcObject;
            if (stream.getTracks) {
              stream.getTracks().forEach(function(t) {
                try { t.stop(); } catch(e) {}
              });
            }
            video.srcObject = null;
          }
          video.removeAttribute('src');
          video.load();
        } catch(e) {}
      }

      // 2. Hentikan media tracks
      if (currentStream && currentStream.getTracks) {
        try {
          currentStream.getTracks().forEach(function(t) {
            try { t.stop(); } catch(e) {}
          });
          currentStream = null;
        } catch(e) {}
      }

      // 3. Hancurkan instance HLS.js worker
      if (hls) {
        try {
          hls.stopLoad();
          hls.detachMedia();
          hls.destroy();
          hls = null;
        } catch(e) {}
      }

      // 4. Tutup WebRTC PeerConnection
      if (pc) {
        try {
          pc.ontrack = null;
          pc.onicecandidate = null;
          pc.oniceconnectionstatechange = null;
          pc.onconnectionstatechange = null;
          if (pc.getSenders) {
            pc.getSenders().forEach(function(s) {
              try { if (s.track) s.track.stop(); } catch(e) {}
            });
          }
          pc.close();
          pc = null;
        } catch(e) {}
      }

      // 5. Beri sinyal ke server MediaMTX untuk menghapus WHEP session
      if (whepSessionUrl) {
        try {
          fetch(whepSessionUrl, { method: 'DELETE' }).catch(function() {});
          whepSessionUrl = null;
        } catch(e) {}
      }
    }

    // Expose ke window untuk diakses oleh React Native WebView
    window.__cleanupVisualPlayer = cleanup;
    window.addEventListener('pagehide', cleanup);
    window.addEventListener('beforeunload', cleanup);
    window.addEventListener('unload', cleanup);

    async function startWhep() {
      try {
        pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        pc.addTransceiver('video', { direction: 'recvonly' });
        pc.addTransceiver('audio', { direction: 'recvonly' });

        pc.ontrack = (event) => {
          if (isCleanedUp) return;
          if (event.streams && event.streams[0]) {
            if (whepFallbackTimer) {
              clearTimeout(whepFallbackTimer);
              whepFallbackTimer = null;
            }
            currentStream = event.streams[0];
            video.srcObject = event.streams[0];
            playVideo();
          }
        };

        pc.oniceconnectionstatechange = () => {
          if (isCleanedUp) return;
          if (pc && (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected')) {
            if (!currentStream) {
              if (whepFallbackTimer) {
                clearTimeout(whepFallbackTimer);
                whepFallbackTimer = null;
              }
              startHls();
            }
          }
        };

        // Fallback otomatis ke HLS jika WebRTC belum mengalirkan video dalam 3 detik
        whepFallbackTimer = setTimeout(() => {
          if (!currentStream && !isCleanedUp) {
            startHls();
          }
        }, 3000);

        const offer = await pc.createOffer();
        if (isCleanedUp) return;
        await pc.setLocalDescription(offer);

        let res = await fetch(whepUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/sdp' },
          body: offer.sdp
        });

        if (!res.ok) {
          throw new Error('WHEP HTTP status ' + res.status);
        }

        // Tangkap WHEP session URL jika dikembalikan di header Location
        const loc = res.headers.get('Location');
        if (loc) {
          try {
            whepSessionUrl = new URL(loc, whepUrl).href;
          } catch(e) {
            whepSessionUrl = loc;
          }
        }

        const answerSdp = await res.text();
        if (isCleanedUp || !pc) return;
        await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
      } catch (e) {
        if (!isCleanedUp) {
          if (whepFallbackTimer) {
            clearTimeout(whepFallbackTimer);
            whepFallbackTimer = null;
          }
          startHls();
        }
      }
    }

    function startHls() {
      if (isCleanedUp || hls) return;
      if (pc) {
        try {
          pc.ontrack = null;
          pc.onicecandidate = null;
          pc.oniceconnectionstatechange = null;
          pc.close();
        } catch(e) {}
        pc = null;
      }
      if (typeof Hls !== 'undefined' && Hls.isSupported()) {
        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        });
        hls.loadSource(hlsUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, function() {
          playVideo();
        });
        hls.on(Hls.Events.ERROR, function(event, data) {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                cleanup();
                break;
            }
          }
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
        ref={webViewRef}
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
