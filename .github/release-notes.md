### 📻 Gaul FM Semarang - Android Release v0.0.5 (Development Build)

- **Versi**: 0.0.5 (versionCode 5)
- **Platform**: Android Standalone APK (Split ABI Per Arsitektur)
- **Arsitektur**: React Native New Architecture + Expo SDK 54
- **Optimasi Ukuran**: APK dipisah berdasarkan arsitektur CPU sehingga ukuran unduhan menjadi jauh lebih ringan (~15–25 MB vs ~70 MB).

#### 📦 Pilihan File APK:
1. **`GaulFM-v0.0.5-arm64-v8a.apk` (Sangat Direkomendasikan)**: Untuk 90%+ smartphone Android modern (64-bit ARM). Ukuran paling ringan dan performa paling optimal.
2. **`GaulFM-v0.0.5-armeabi-v7a.apk`**: Untuk smartphone Android 32-bit (perangkat tipe lama atau entry level).
3. **`GaulFM-v0.0.5-universal.apk`**: Varian universal (mencakup semua arsitektur, bisa diinstal di perangkat apa saja jika ragu).
4. **`GaulFM-v0.0.5-x86.apk` / `GaulFM-v0.0.5-x86_64.apk`**: Khusus untuk emulator PC/Laptop Android, Chromebook, atau perangkat berprosesor Intel/AMD.

#### 🚀 Fitur & Pembaruan v0.0.5:
- **Visual Radio Lebih Stabil**: Negosiasi WebRTC, pembersihan sesi WHEP, dan fallback HLS diperkuat agar pemutar pulih saat jaringan atau ingest berubah.
- **Audio Tanpa Race Condition**: Perintah play/stop yang bertumpuk kini memakai urutan operasi sehingga audio lama tidak hidup kembali setelah pengguna berhenti.
- **Endpoint Streaming Terbaru**: Development build memakai API HTTPS `admingaul.duckdns.org` serta jalur RTMP dan HLS server yang sudah diperbaiki.
- **Player Lebih Ringan**: HTML player dipisahkan dari komponen React Native agar lebih mudah diuji dan dipelihara.
- **Pemisahan Binary APK (Split ABI)**: Tetap menghasilkan APK arm64, armeabi-v7a, x86, x86_64, dan universal.

#### 📲 Petunjuk Penginstalan:
1. Unduh salah satu varian APK di bawah (pilih **`arm64-v8a`** untuk smartphone modern Anda).
2. Buka file APK pada smartphone Android Anda.
3. Jika muncul peringatan keamanan, pilih **Tetap Instal** / **Izinkan sumber ini**.
4. Aplikasi siap digunakan untuk mendengarkan audio Icecast dan nonton visual radio Gaul FM Semarang!
