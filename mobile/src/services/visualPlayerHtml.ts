// Keep the embedded runtime independent of React so connection races can be tested.
function scriptValue(value: string): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function getVisualPlayerHtml(whepUrl: string, hlsUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />

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

    <div id="stream-status" role="status" style="position:absolute;left:12px;right:12px;top:12px;color:white;background:rgba(0,0,0,.7);padding:8px;border-radius:8px;font:13px sans-serif;pointer-events:none">Menghubungkan siaran...</div>
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
    const whepUrl = ${scriptValue(whepUrl)};
    const hlsUrl = ${scriptValue(hlsUrl)};
    const video = document.getElementById('video');

    let pc = null;
    let hls = null;
    let whepSessionUrl = null;
    let currentStream = null;
    let isCleanedUp = false;
    let whepFallbackTimer = null;
    let retryTimer = null;
    let generation = 0;
    let transport = '';
    let retryCount = 0;
    let lastProgressAt = Date.now();
    let lastVideoTime = 0;
    let hlsScript = null;
    const status = document.getElementById('stream-status');
    function showStatus(message) { status.textContent = message; status.style.display = message ? 'block' : 'none'; }
    video.addEventListener('timeupdate', function() {
      if (isCleanedUp || video.readyState < 2 || video.currentTime === lastVideoTime) return;
      lastVideoTime = video.currentTime;
      lastProgressAt = Date.now();
      retryCount = 0;
      showStatus(video.muted ? 'Ketuk video untuk mengaktifkan suara' : '');
      if (whepFallbackTimer) { clearTimeout(whepFallbackTimer); whepFallbackTimer = null; }
    });
    video.addEventListener('error', function() { if (transport === 'hls') scheduleRetry(); });
    const watchdog = setInterval(function() {
      if (!isCleanedUp && !retryTimer && Date.now() - lastProgressAt > 15000) {
        if (transport === 'whep') startHls(); else scheduleRetry();
      }
    }, 3000);

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
              document.documentElement.requestFullscreen().catch(function() {});
            } else if (video && video.webkitEnterFullscreen) {
              video.webkitEnterFullscreen();
            }
          });
        } else if (container.webkitRequestFullscreen) {
          container.webkitRequestFullscreen();
        } else if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(function() {});
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
          if (!isCleanedUp) video.muted = false;
        }).catch(function() {
          if (isCleanedUp || !video) return;
          video.muted = false;
          video.play().catch(function() {
            if (isCleanedUp) return;
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

    function deleteSession(url) {
      if (url) fetch(url, { method: 'DELETE', keepalive: true }).catch(function() {});
    }

    function disposeTransport() {
      generation++;
      clearTimeout(whepFallbackTimer);
      whepFallbackTimer = null;
      if (pc) {
        pc.ontrack = pc.oniceconnectionstatechange = pc.onconnectionstatechange = null;
        pc.close();
        pc = null;
      }
      deleteSession(whepSessionUrl);
      whepSessionUrl = null;
      if (hls) { hls.destroy(); hls = null; }
      if (currentStream) { currentStream.getTracks().forEach(function(t) { t.stop(); }); currentStream = null; }
      video.pause();
      video.srcObject = null;
      video.removeAttribute('src');
      video.load();
    }

    function cleanup() {
      if (isCleanedUp) return;
      isCleanedUp = true;
      clearInterval(watchdog);
      clearTimeout(hideTimer);
      clearTimeout(retryTimer);
      retryTimer = null;
      if (hlsScript) { hlsScript.onload = hlsScript.onerror = null; hlsScript.remove(); }
      disposeTransport();
    }
    window.__cleanupVisualPlayer = cleanup;
    window.addEventListener('pagehide', cleanup);
    window.addEventListener('beforeunload', cleanup);

    function scheduleRetry() {
      if (isCleanedUp || retryTimer) return;
      disposeTransport();
      transport = '';
      showStatus('Siaran terputus. Menghubungkan ulang...');
      const delay = Math.min(20000, 2000 * Math.pow(2, retryCount++));
      retryTimer = setTimeout(function() {
        retryTimer = null;
        startWhep();
      }, delay);
    }

    async function startWhep() {
      if (isCleanedUp) return;
      disposeTransport();
      transport = 'whep';
      lastProgressAt = Date.now();
      const attempt = generation;
      const active = function() { return !isCleanedUp && attempt === generation; };
      showStatus('Menghubungkan siaran...');
      try {
        const peer = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        pc = peer;
        peer.addTransceiver('video', { direction: 'recvonly' });
        peer.addTransceiver('audio', { direction: 'recvonly' });
        peer.ontrack = function(event) {
          if (!active()) return;
          if (!currentStream) currentStream = new MediaStream();
          if (!currentStream.getTracks().includes(event.track)) currentStream.addTrack(event.track);
          video.srcObject = currentStream;
          try { event.receiver.playoutDelayHint = 0.35; } catch (_) {}
          playVideo();
        };
        peer.oniceconnectionstatechange = function() {
          if (active() && ['failed', 'disconnected'].includes(peer.iceConnectionState)) startHls();
        };
        // A track event only signals negotiation, not receipt of playable media.
        whepFallbackTimer = setTimeout(function() { if (active()) startHls(); }, 10000);
        await peer.setLocalDescription(await peer.createOffer());
        // Send gathered candidates in the SDP; this client does not use trickle PATCH.
        await new Promise(function(resolve) {
          if (peer.iceGatheringState === 'complete') { resolve(); return; }
          const done = function() {
            clearTimeout(timer);
            peer.removeEventListener('icegatheringstatechange', check);
            resolve();
          };
          const check = function() { if (peer.iceGatheringState === 'complete') done(); };
          const timer = setTimeout(done, 2000);
          peer.addEventListener('icegatheringstatechange', check);
        });
        if (!active()) return;
        const res = await fetch(whepUrl, {
          method: 'POST', headers: { 'Content-Type': 'application/sdp' }, body: peer.localDescription.sdp
        });
        const location = res.headers.get('Location');
        const session = location ? new URL(location, whepUrl).href : null;
        if (!active()) { deleteSession(session); return; }
        whepSessionUrl = session;
        if (!res.ok) throw new Error('WHEP ' + res.status);
        const answer = await res.text();
        if (active()) await peer.setRemoteDescription({ type: 'answer', sdp: answer });
      } catch (_) { if (active()) startHls(); }
    }

    function startHls() {
      if (isCleanedUp || transport === 'hls') return;
      disposeTransport();
      transport = 'hls';
      lastProgressAt = Date.now();
      const attempt = generation;
      const active = function() { return !isCleanedUp && attempt === generation; };
      showStatus('Menghubungkan video cadangan...');
      const nativeHls = !!video.canPlayType('application/vnd.apple.mpegurl');
      if (!window.MediaSource && nativeHls) {
        video.src = hlsUrl;
        playVideo();
        return;
      }
      function attachHls() {
        if (!active()) return;
        if (!window.Hls || !Hls.isSupported()) {
          if (nativeHls) { video.src = hlsUrl; playVideo(); } else scheduleRetry();
          return;
        }
        hls = new Hls({ enableWorker: true, lowLatencyMode: true,
          backBufferLength: 10, maxBufferLength: 10, maxMaxBufferLength: 20,
          liveSyncDurationCount: 2, liveMaxLatencyDurationCount: 5,
          maxLiveSyncPlaybackRate: 1.1 });
        hls.on(Hls.Events.MANIFEST_PARSED, function() { if (active()) playVideo(); });
        hls.on(Hls.Events.ERROR, function(_event, data) {
          if (active() && data.fatal) scheduleRetry();
        });
        hls.loadSource(hlsUrl);
        hls.attachMedia(video);
      }
      if (window.Hls) { attachHls(); return; }
      if (hlsScript) hlsScript.remove();
      hlsScript = document.createElement('script');
      hlsScript.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.7/dist/hls.min.js';
      hlsScript.onload = attachHls;
      hlsScript.onerror = function() { if (active()) scheduleRetry(); };
      document.head.appendChild(hlsScript);
    }

    startWhep();
  </script>
</body>
</html>
`;
}
