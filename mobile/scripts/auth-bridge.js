const http = require("http");
const { exec } = require("child_process");

function ensureAdbReverse() {
  exec("adb reverse tcp:3000 tcp:3000", (err) => {
    if (err) {
      console.warn("[Bridge] adb reverse warning:", err.message);
    } else {
      console.log("[Bridge] adb reverse tcp:3000 tcp:3000 OK");
    }
  });
}

ensureAdbReverse();
// Jalankan ulang setiap 30 detik agar ADB reverse tetap aktif
setInterval(ensureAdbReverse, 30000);

const server = http.createServer((req, res) => {
  console.log(`[Bridge] Incoming request: ${req.method} ${req.url}`);
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Gaul FM — Login Sukses</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      background: #050505;
      color: #FFFFFF;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 90vh;
      margin: 0;
      text-align: center;
      padding: 20px;
    }
    .spinner {
      width: 44px;
      height: 44px;
      border: 4px solid rgba(255,255,255,0.15);
      border-top-color: #00E5FF;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 24px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    h2 { margin: 0 0 10px 0; color: #00E5FF; font-size: 22px; font-weight: 800; }
    p { color: #A0A0A0; font-size: 14px; line-height: 1.5; margin: 0 0 20px 0; }
    a.btn {
      background: #007A3E;
      color: #fff;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 12px;
      font-weight: 700;
      font-size: 14px;
      display: inline-block;
    }
  </style>
</head>
<body>
  <div class="spinner"></div>
  <h2>Autentikasi Berhasil!</h2>
  <p>Sedang mengalihkan kembali ke aplikasi Gaul FM...</p>
  <a id="open-app-btn" class="btn" href="#">Buka Aplikasi</a>

  <script>
    (function() {
      var hash = window.location.hash || "";
      var search = window.location.search || "";
      var payload = hash ? hash : search;
      
      // Target Expo Go redirect callback
      var target = "exp://192.168.100.11:8081/--/auth/callback" + payload;
      var btn = document.getElementById("open-app-btn");
      btn.href = target;
      
      // Coba redirect otomatis seketika
      try {
        window.location.replace(target);
      } catch (e) {
        window.location.href = target;
      }
      
      // Fallback kedua setelah jeda singkat
      setTimeout(function() {
        try {
          window.location.href = target;
        } catch (e) {}
      }, 600);
    })();
  </script>
</body>
</html>`);
});

server.listen(3000, "0.0.0.0", () => {
  console.log("[Bridge] OAuth Bridge aktif di http://0.0.0.0:3000");
});
