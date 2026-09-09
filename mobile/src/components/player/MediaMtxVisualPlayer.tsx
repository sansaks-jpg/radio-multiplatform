import React, { useEffect, useRef } from "react";
import { Pressable, View } from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import {
  VISUAL_RTMP_URL,
  VISUAL_WHEP_URL,
  VISUAL_HLS_URL,
} from "../../services/visualStream";
import { stopLive } from "../../services/audio/trackPlayerService";

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

  // Pastikan radio Icecast dimatikan total saat visual player dibuka
  useEffect(() => {
    void stopLive();
  }, []);

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
  <video id="video" autoplay playsinline></video>

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
      video.muted = false;
      video.play().catch(function() {
        if (isCleanedUp || !video) return;
        video.muted = true;
        video.play().catch(function() {});
      });
    }

    // Tap di mana saja pada video untuk menyalakan audio jika ter-mute oleh kebijakan OS
    video.addEventListener('click', function() {
      if (video.muted) {
        video.muted = false;
        video.play().catch(function() {});
      }
    });

    function toggleFullscreen() {
      const el = video;
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        if (el.requestFullscreen) {
          el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
          el.webkitRequestFullscreen();
        } else if (el.webkitEnterFullscreen) {
          el.webkitEnterFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      }
    }
    window.toggleFullscreen = toggleFullscreen;

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
            try {
              if (pc && pc.getReceivers) {
                pc.getReceivers().forEach(function(r) {
                  if ('playoutDelayHint' in r) {
                    r.playoutDelayHint = 0.35; // 350ms smoothing buffer setara YouTube live
                  }
                });
              }
            } catch(e) {}
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
    <View
      className="relative w-full overflow-hidden bg-black"
      style={{ minHeight: 215, aspectRatio: 16 / 9 }}
    >
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent, baseUrl: "http://40.81.231.250:8888/" }}
        style={{ flex: 1, width: "100%", minHeight: 215, backgroundColor: "#000000" }}
        allowsInlineMediaPlayback
        allowsFullscreenVideo
        mixedContentMode="always"
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        androidLayerType="hardware"
        setSupportMultipleWindows={false}
        originWhitelist={["*"]}
      />

      {/* ── Tombol Fullscreen (Layar Penuh) ── */}
      <Pressable
        onPress={() => {
          webViewRef.current?.injectJavaScript("if (typeof window.toggleFullscreen === 'function') { window.toggleFullscreen(); } true;");
        }}
        accessibilityRole="button"
        accessibilityLabel="Layar penuh (Fullscreen)"
        className="absolute bottom-2.5 right-2.5 rounded-lg bg-black/70 p-2 active:opacity-75 z-30 border border-white/20 shadow-md flex-row items-center gap-1"
      >
        <Ionicons name="expand" size={15} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}
