import React, { useEffect, useRef } from "react";
import { View } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import * as ScreenOrientation from "expo-screen-orientation";
import {
  VISUAL_RTMP_URL,
  VISUAL_WHEP_URL,
  VISUAL_HLS_URL,
} from "../../services/visualStream";
import { stopLive } from "../../services/audio/trackPlayerService";
import { setAudioModeAsync } from "expo-audio";

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

  // Pastikan radio Icecast dimatikan total & audio mode ponsel aktif untuk pemutaran video
  useEffect(() => {
    void stopLive();
    try {
      void setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        interruptionMode: "duckOthers",
      });
    } catch {}

    // Kembalikan orientasi ke portrait saat player ditutup/unmount
    return () => {
      void ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      ).catch(() => {});
    };
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

  // Tangani sinyal fullscreen dari WebView untuk mengubah orientasi perangkat otomatis ke landscape
  const handleMessage = async (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.event === "fullscreen_toggled") {
        if (data.isFullscreen) {
          await ScreenOrientation.lockAsync(
            ScreenOrientation.OrientationLock.LANDSCAPE
          );
        } else {
          await ScreenOrientation.lockAsync(
            ScreenOrientation.OrientationLock.PORTRAIT_UP
          );
        }
      }
    } catch {}
  };

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <script src="https://cdn.jsdelivr.net/npm/hls.js@1.5.7/dist/hls.min.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      border: none !important;
      outline: none !important;
    }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #000000;
      user-select: none;
      -webkit-user-select: none;
      -webkit-tap-highlight-color: transparent;
    }
    #player-container {
      position: relative;
      width: 100%;
      height: 100%;
      background: #000000;
      overflow: hidden;
      display: flex;
      justify-content: center;
      align-items: center;
      border: none !important;
      outline: none !important;
    }
    video {
      width: 100%;
      height: 100%;
      object-fit: contain;
      background: #000000;
      border: none !important;
      outline: none !important;
    }
    /* Sembunyikan TOTAL seluruh UI bawaan browser (durasi, pause, timeline bar, garis scrubber) */
    video::-webkit-media-controls,
    video::-webkit-media-controls-panel,
    video::-webkit-media-controls-play-button,
    video::-webkit-media-controls-start-playback-button,
    video::-webkit-media-controls-timeline,
    video::-webkit-media-controls-timeline-container,
    video::-webkit-media-controls-current-time-display,
    video::-webkit-media-controls-time-remaining-display,
    video::-webkit-media-controls-seek-back-button,
    video::-webkit-media-controls-seek-forward-button,
    video::-webkit-media-controls-fullscreen-button,
    video::-webkit-media-controls-rewind-button,
    video::-webkit-media-controls-return-to-realtime-button,
    video::-webkit-media-controls-toggle-closed-captions-button,
    video::-webkit-media-controls-volume-control-container,
    video::-webkit-media-controls-volume-slider,
    video::-webkit-media-controls-mute-button,
    video::-webkit-media-controls-overflow-button,
    video::-webkit-media-controls-overflow-menu-list,
    video::-webkit-media-controls-overlay-enclosure,
    video::-webkit-media-controls-enclosure {
      display: none !important;
      -webkit-appearance: none !important;
      opacity: 0 !important;
      visibility: hidden !important;
      pointer-events: none !important;
      width: 0 !important;
      height: 0 !important;
      max-height: 0 !important;
    }
    video::-moz-media-controls {
      display: none !important;
    }
    *::-webkit-media-controls-panel {
      display: none !important;
      -webkit-appearance: none !important;
    }
    /* Sleek Bottom Gradient Scrim dengan Tombol Fullscreen Saja */
    .controls-overlay {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: 56px;
      display: flex;
      align-items: flex-end;
      justify-content: flex-end;
      padding: 0 14px 12px 14px;
      background: linear-gradient(to top, rgba(0, 0, 0, 0.65) 0%, rgba(0, 0, 0, 0) 100%);
      pointer-events: none;
      z-index: 20;
      transition: opacity 0.2s ease;
    }
    .controls-overlay.hidden {
      opacity: 0;
      pointer-events: none;
    }
    .ctrl-btn {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.55);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      outline: none;
      color: #ffffff;
      pointer-events: auto;
      -webkit-tap-highlight-color: transparent;
      transition: transform 0.1s, background 0.15s;
    }
    .ctrl-btn:active {
      transform: scale(0.9);
      background: rgba(255, 255, 255, 0.25);
    }
  </style>
</head>
<body>
  <div id="player-container">
    <video
      id="video"
      autoplay
      playsinline
      webkit-playsinline="true"
      x5-playsinline="true"
      x5-video-player-type="h5"
      x5-video-player-fullscreen="true"
      disablePictureInPicture
      disableremoteplayback
      controlslist="nodownload nofullscreen noremoteplayback noplaybackrate"
    ></video>

    <!-- Hanya Tombol Fullscreen Saja -->
    <div id="controls-overlay" class="controls-overlay">
      <button id="fs-btn" class="ctrl-btn" onclick="toggleFullscreen(event)" aria-label="Layar Penuh">
        <svg id="icon-fs" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
        </svg>
      </button>
    </div>
  </div>

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

    function isCurrentlyFullscreen() {
      return !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        (video && video.webkitDisplayingFullscreen)
      );
    }

    function updateFullscreenUi() {
      const isFs = isCurrentlyFullscreen();
      const fsIcon = document.getElementById('icon-fs');
      if (fsIcon) {
        if (isFs) {
          fsIcon.innerHTML = '<path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>';
        } else {
          fsIcon.innerHTML = '<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>';
        }
      }
    }

    function toggleFullscreen(e) {
      if (e) {
        try { e.stopPropagation(); } catch(err) {}
        try { e.preventDefault(); } catch(err) {}
      }

      const isFs = isCurrentlyFullscreen();

      if (!isFs) {
        if (screen.orientation && screen.orientation.lock) {
          screen.orientation.lock('landscape').catch(function() {});
        }

        // Request fullscreen pada container (BUKAN video tag) agar tidak memicu UI default media player
        const container = document.getElementById('player-container') || document.documentElement;
        if (container.requestFullscreen) {
          container.requestFullscreen().catch(function() {
            if (document.documentElement.requestFullscreen) {
              document.documentElement.requestFullscreen();
            } else if (video && video.webkitEnterFullscreen) {
              video.webkitEnterFullscreen();
            }
          });
        } else if (container.webkitRequestFullscreen) {
          container.webkitRequestFullscreen();
        } else if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen();
        } else if (video && video.webkitEnterFullscreen) {
          video.webkitEnterFullscreen();
        }
      } else {
        if (screen.orientation && screen.orientation.unlock) {
          try { screen.orientation.unlock(); } catch(err) {}
        }

        if (document.exitFullscreen) {
          document.exitFullscreen().catch(function() {});
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        } else if (video && video.webkitExitFullscreen) {
          video.webkitExitFullscreen();
        }
      }

      setTimeout(updateFullscreenUi, 250);
      setTimeout(updateFullscreenUi, 600);

      try {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            event: 'fullscreen_toggled',
            isFullscreen: !isFs
          }));
        }
      } catch(err) {}
    }
    window.toggleFullscreen = toggleFullscreen;

    function handleFullscreenChange() {
      const isFs = isCurrentlyFullscreen();
      updateFullscreenUi();
      try {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            event: 'fullscreen_toggled',
            isFullscreen: isFs
          }));
        }
      } catch(err) {}
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    if (video) {
      video.addEventListener('webkitbeginfullscreen', handleFullscreenChange);
      video.addEventListener('webkitendfullscreen', handleFullscreenChange);
    }

    // Controls overlay auto-hide
    let hideTimer = null;
    const overlay = document.getElementById('controls-overlay');

    function resetHideTimer() {
      if (!overlay) return;
      overlay.classList.remove('hidden');
      clearTimeout(hideTimer);
      hideTimer = setTimeout(function() {
        overlay.classList.add('hidden');
      }, 2500);
    }

    const container = document.getElementById('player-container');
    if (container) {
      container.addEventListener('click', function(e) {
        if (e.target.closest && e.target.closest('.ctrl-btn')) return;
        if (video && video.muted) {
          video.muted = false;
          video.volume = 1.0;
          video.play().catch(function() {});
        }
        if (overlay.classList.contains('hidden')) {
          resetHideTimer();
        } else {
          overlay.classList.add('hidden');
        }
      });

      let lastTap = 0;
      container.addEventListener('touchend', function(e) {
        if (e.target.closest && e.target.closest('.ctrl-btn')) return;
        const now = Date.now();
        const diff = now - lastTap;
        if (diff < 300 && diff > 0) {
          toggleFullscreen(e);
        }
        lastTap = now;
      });
    }

    resetHideTimer();

    function playVideo() {
      if (isCleanedUp || !video) return;
      video.muted = false;
      video.volume = 1.0;
      var promise = video.play();
      if (promise !== undefined) {
        promise.then(function() {
          video.muted = false;
        }).catch(function() {
          if (isCleanedUp || !video) return;
          video.muted = false;
          video.play().catch(function() {
            video.muted = true;
            video.play().catch(function() {});
            var unmuteOnce = function() {
              if (video) {
                video.muted = false;
                video.volume = 1.0;
              }
              window.removeEventListener('touchstart', unmuteOnce);
              window.removeEventListener('click', unmuteOnce);
            };
            window.addEventListener('touchstart', unmuteOnce, { once: true, passive: true });
            window.addEventListener('click', unmuteOnce, { once: true, passive: true });
          });
        });
      }
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
      className="relative w-full bg-black overflow-hidden"
      style={{ width: "100%", aspectRatio: 16 / 9 }}
    >
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent, baseUrl: "http://40.81.231.250:8888/gaulfm_webrtc/" }}
        style={{ width: "100%", height: "100%", backgroundColor: "#000000" }}
        allowsInlineMediaPlayback
        allowsFullscreenVideo
        mixedContentMode="always"
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        androidLayerType="hardware"
        setSupportMultipleWindows={false}
        originWhitelist={["*"]}
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        onMessage={handleMessage}
        injectedJavaScript="setTimeout(function(){ var v = document.getElementById('video'); if (v) { v.muted = false; v.volume = 1.0; v.play().catch(function(){}); } }, 200); true;"
      />
    </View>
  );
}
