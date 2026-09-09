import React, { useEffect, useRef } from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";
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
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <script src="https://cdn.jsdelivr.net/npm/hls.js@1.5.7/dist/hls.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #000000;
      user-select: none;
      -webkit-user-select: none;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
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
    }
    video {
      width: 100%;
      height: 100%;
      object-fit: contain;
      background: #000000;
    }
    /* Sleek YouTube-style Bottom Scrim Controls */
    .controls-overlay {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: 60px;
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      padding: 0 12px 10px 12px;
      background: linear-gradient(to top, rgba(0, 0, 0, 0.75) 0%, rgba(0, 0, 0, 0) 100%);
      pointer-events: none;
      z-index: 20;
      transition: opacity 0.2s ease;
    }
    .controls-overlay.hidden {
      opacity: 0;
      pointer-events: none;
    }
    .controls-left, .controls-right {
      display: flex;
      align-items: center;
      gap: 10px;
      pointer-events: auto;
    }
    .ctrl-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.55);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.18);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      outline: none;
      color: #ffffff;
      -webkit-tap-highlight-color: transparent;
      transition: transform 0.1s, background 0.15s;
    }
    .ctrl-btn:active {
      transform: scale(0.9);
      background: rgba(255, 255, 255, 0.25);
    }
    .live-badge {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 3px 7px;
      border-radius: 4px;
      background: #dc2626;
      color: #ffffff;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.05em;
    }
    .live-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #ffffff;
    }
  </style>
</head>
<body>
  <div id="player-container">
    <video id="video" autoplay playsinline></video>

    <!-- Sleek YouTube-style Bottom Scrim Controls -->
    <div id="controls-overlay" class="controls-overlay">
      <div class="controls-left">
        <button id="mute-btn" class="ctrl-btn" onclick="toggleMute(event)" aria-label="Mute/Unmute">
          <svg id="icon-sound" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
          </svg>
        </button>
        <div class="live-badge">
          <span class="live-dot"></span>
          <span>LIVE</span>
        </div>
      </div>

      <div class="controls-right">
        <button id="fs-btn" class="ctrl-btn" onclick="toggleFullscreen(event)" aria-label="Layar Penuh">
          <svg id="icon-fs" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
          </svg>
        </button>
      </div>
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
        if (video && video.requestFullscreen) {
          video.requestFullscreen().catch(function() {
            var container = document.getElementById('player-container') || document.documentElement;
            if (container.requestFullscreen) container.requestFullscreen();
          });
        } else if (video && video.webkitEnterFullscreen) {
          video.webkitEnterFullscreen();
        } else if (video && video.webkitRequestFullscreen) {
          video.webkitRequestFullscreen();
        } else {
          var container = document.getElementById('player-container') || document.documentElement;
          if (container.requestFullscreen) {
            container.requestFullscreen();
          } else if (container.webkitRequestFullscreen) {
            container.webkitRequestFullscreen();
          }
        }
      } else {
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

    document.addEventListener('fullscreenchange', updateFullscreenUi);
    document.addEventListener('webkitfullscreenchange', updateFullscreenUi);
    if (video) {
      video.addEventListener('webkitbeginfullscreen', updateFullscreenUi);
      video.addEventListener('webkitendfullscreen', updateFullscreenUi);
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
        // Unmute otomatis saat user tap di mana saja jika sebelumnya muted oleh OS
        if (video && video.muted) {
          video.muted = false;
          video.volume = 1.0;
          video.play().catch(function() {});
          updateAudioUi();
        }
        if (overlay.classList.contains('hidden')) {
          resetHideTimer();
        } else {
          overlay.classList.add('hidden');
        }
      });

      // Double tap to toggle fullscreen
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

    function updateAudioUi() {
      const icon = document.getElementById('icon-sound');
      if (!icon || !video) return;
      if (video.muted) {
        icon.innerHTML = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line>';
      } else {
        icon.innerHTML = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>';
      }
    }

    function toggleMute(e) {
      if (e) e.stopPropagation();
      if (!video) return;
      video.muted = !video.muted;
      if (!video.muted) {
        video.volume = 1.0;
        video.play().catch(function() {});
      }
      updateAudioUi();
      resetHideTimer();
    }

    function playVideo() {
      if (isCleanedUp || !video) return;
      video.muted = false;
      video.volume = 1.0;
      var promise = video.play();
      if (promise !== undefined) {
        promise.then(function() {
          video.muted = false;
          updateAudioUi();
        }).catch(function() {
          if (isCleanedUp || !video) return;
          video.muted = false;
          video.play().then(function() {
            updateAudioUi();
          }).catch(function() {
            video.muted = true;
            video.play().catch(function() {});
            updateAudioUi();
            var unmuteOnce = function() {
              if (video) {
                video.muted = false;
                video.volume = 1.0;
                updateAudioUi();
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
        source={{ html: htmlContent, baseUrl: "http://40.81.231.250:8888/" }}
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
        bounces={false}
        overScrollMode="never"
        injectedJavaScript="setTimeout(function(){ var v = document.getElementById('video'); if (v) { v.muted = false; v.volume = 1.0; v.play().catch(function(){}); if (typeof updateAudioUi === 'function') updateAudioUi(); } }, 200); true;"
      />
    </View>
  );
}
