# AGENTS.md

Panduan panduan teknis dan operasional untuk agen AI / pengembang pada repositori **Gaul FM Semarang**.

## Project Overview

**Gaul FM Semarang** adalah ekosistem aplikasi radio siaran langsung multi-platform yang mencakup:

- **`mobile/`** — Aplikasi mobile pendengar (React Native Expo SDK 54, Android/iOS/Web).
- **`admin/`** — Web Dashboard Admin & Penyiar (Next.js 16.2 App Router, Tailwind CSS v4).
- **`supabase/`** — Skema database PostgreSQL, RLS policies, seed dummy data, dan Supabase Edge Functions.
- **`.github/workflows/`** — Otomatisasi CI/CD GitHub Actions untuk build APK Android.
- **`PRD.md`** — Product Requirements Document (sumber kebenaran arsitektur dan spesifikasi fitur).
- **Server Azure Cloud (`40.81.231.250`)** — Hosting PM2 Web Admin, MediaMTX WebRTC/HLS/RTMP server, dan FFmpeg streaming orchestrator.

---

## 1. Mobile App (`mobile/`)

### Tech Stack

| Layer | Pilihan Teknologi | Keterangan |
|---|---|---|
| Runtime | Expo SDK 54, TypeScript 5.9 | `newArchEnabled: true` (New Architecture + Patched RNTP 4.1.2) |
| Styling | NativeWind v4 (Tailwind 3.4) + CSS class-based | Tema "Gaul Neon Night" / Dark Theme Studio |
| Navigation | React Navigation 7 | RootNavigator → AuthStack / MainTabs |
| State Management | Zustand 5 | `playerStore`, `authStore`, `reminderStore`, `themeStore` |
| Data Caching | TanStack Query v5 + AsyncStorage persister | Direct WordPress REST API (`radiogaulfmsmg.com`) + Offline cache |
| Audio Engine | `react-native-track-player` 4.1.2 (Native) | Support background playback & lockscreen controls |
| Audio Fallback | `expo-audio` / `HTMLAudioElement` | Fallback otomatis untuk Expo Go / Web |
| Visual Radio | MediaMTX WebRTC (WHEP) & HLS Fallback | Latensi ultra-rendah (<0.3s) via `react-native-webview` |
| Orientation | `expo-screen-orientation` | Otomatis rotasi ke Landscape saat Fullscreen, Portrait saat keluar |
| Push Notifications | `expo-notifications` | Pengingat jadwal siaran & notifikasi berita |

### Source Structure (`mobile/src/`)

```
src/
├── navigation/    RootNavigator, AuthStack, MainTabs (Mini Player di atas tab bar)
├── screens/       Splash, Onboarding, auth/ (Login, Register, Forgot, Reset), home/, schedule/, news/, profile/
├── components/    player/ (LiveBadge, LiveDetailSheet, MediaMtxVisualPlayer, MiniPlayer), schedule/, news/, ui/
├── stores/        playerStore, authStore, reminderStore, themeStore, toastStore
├── services/      audio/ (playerEngine, trackPlayerService, streamResolver), visualStream, comments, supabase, notifications, location, deviceInfo
├── hooks/         usePlayerControls, useNowPlaying, usePrograms, useNews, useProfile, useBanners, useLiveComments
├── mocks/         nowPlaying, programs, news, banners, comments (Data dummy fallback)
├── theme/         tokens.ts, ThemeRoot.tsx ("Gaul Neon Night")
├── types/         index.ts, assets.d.ts
└── utils/         datetime.ts (WIB UTC+7 helpers), html.ts
```

### Audio, Visual & Live Chat Contracts

1. **Audio Live Stream (Icecast Progressive HTTP)**:
   - Playlist URL: `http://27.50.19.173:9000/gaulfm.m3u`
   - Orchestration: `trackPlayerService.ts` menggunakan token generasi operasi (`currentOperationGeneration`) untuk mencegah race condition play/pause.
   - Patch: `patches/react-native-track-player+4.1.2.patch` menyelesaikan masalah Kotlin 2.x null-safety pada `MusicModule.kt` dan background media session di Android 13+.
2. **Visual Radio (MediaMTX WHEP/WebRTC & Transcoding)**:
   - WHEP Endpoint: `http://40.81.231.250:8889/gaulfm_webrtc/whep`
   - HLS Fallback: `http://40.81.231.250:8888/gaulfm/index.m3u8`
   - Audio Switching: Mengaktifkan visual radio otomatis menghentikan streaming audio Icecast (`stopLive()`) agar audio tidak tumpang tindih.
   - Resampling Anti-Stutter: Transcoder `engine_visual.py` di server menerapkan filter audio `-af aresample=async=1000:min_hard_comp=0.100000:first_pts=0` dan codec `libopus -b:a 128k -vbr on -application audio -cutoff 20000` untuk sinkronisasi PTS audio vMix tanpa jitter.
   - Client Smoothing Buffer: WebRTC receiver menggunakan `playoutDelayHint = 0.35` (350ms smoothing buffer setara YouTube Live).
   - Layout 16:9 Edge-to-Edge: Mode live komentar menggunakan layout penuh tanpa margin samping (`w-full aspect-[16/9]`) tanpa hardcoded `minHeight` sehingga sisi kanan tidak terpotong oleh `overflow-hidden`.
   - Fullscreen Landscape Otomatis: Integrasi `expo-screen-orientation` mengunci orientasi ke Landscape saat mode fullscreen aktif, dan kembali ke Portrait saat ditutup.
   - UI Bersih Tanpa Kontrol Bawaan: Fullscreen diminta pada container `#player-container` (bukan tag `<video>`) serta menerapkan CSS penonaktifan total untuk seluruh pseudo-elemen `::-webkit-media-controls*` sehingga garis timeline/scrubber, tombol pause, dan teks durasi bawaan browser disembunyikan. Hanya tersisa satu tombol fullscreen minimalis di sudut kanan bawah dengan auto-hide 2.5 detik.
3. **Serverless Live Chat & Moderasi**:
   - Hard-cap Riwayat: Maksimal 50 komentar (`MAX_LIVE_COMMENTS = 50`, `MAX_HISTORY_COMMENTS = 50`) baik di client maupun server demi efisiensi kuota data & memori.
   - Layout Rata Kiri Seragam: Seluruh pesan (milik sendiri, orang lain, studio) rata kiri ala YouTube Live Chat, dengan pembeda warna nama, inisial avatar, dan badge (*Studio* / *On Air*).
   - Lifecycle-Aware: Polling/SSE hanya berjalan saat `LiveDetailSheet` terbuka (zero bandwidth saat player ditutup).

### Perintah Mobile

```bash
cd mobile

npm install              # Install dependencies + otomatis menerapkan patch-package
cp .env.example .env     # Salin template environment variabel (opsional jika menggunakan demo mode)

npm run dev              # Jalankan Metro dev server
npm run web              # Preview web listener app
npm run android          # Jalankan native development build di Android
npm run typecheck        # Validasi tipe TypeScript
npm run lint             # Linting kode
```

---

## 2. Web Admin Dashboard (`admin/`)

### Tech Stack

| Layer | Pilihan Teknologi | Keterangan |
|---|---|---|
| Framework | Next.js 16.2 (Turbopack, App Router) | React 19, TypeScript strict |
| Styling | Tailwind CSS v4 + next-themes | Dashboard responsif Dark/Light mode |
| UI Components | Radix UI / Custom Shell | Sidebar, Modal, Badge, Toast, Page Header |
| Excel Export | SheetJS (`xlsx`) | Export data pendengar terdaftar ke file `.xlsx` |
| Marketing Sync | Next.js API Route (`/api/sync-sheets`) | Webhook Supabase sync ke Google Sheets |
| Live Chat API | Next.js Serverless Routes (`/api/comments/*`) | REST, SSE streaming (`/stream`), dan moderasi on-air |
| Streaming Orchestrator | Halaman `/streams` | Pusat instruksi ingest vMix, RadioBOSS, dan YouTube Live |

### Source Structure (`admin/src/`)

```
src/
├── app/
│   ├── layout.tsx              RootLayout + ThemeProvider + AppShell
│   ├── page.tsx                Dashboard overview (Now Playing, Stats, Schedule Quick View)
│   ├── chat/page.tsx           Live Chat moderation dashboard (On Air pin, Hide, Broadcast)
│   ├── now-playing/page.tsx    Broadcaster panel untuk update live track & DJ on-air
│   ├── streams/page.tsx        Streaming Orchestrator (vMix RTMP, RadioBOSS Icecast, YouTube Live)
│   ├── schedule/page.tsx       CRUD master jadwal siaran 7 hari
│   ├── news/page.tsx           Sinkronisasi berita WordPress & editor artikel
│   ├── banners/page.tsx        Manajemen banner promosi mobile app
│   ├── users/page.tsx          Tabel data pendengar & export Excel (.xlsx)
│   └── api/
│       ├── comments/           GET & POST live comments (/route.ts)
│       ├── comments/stream/    Server-Sent Events streaming live comments
│       ├── comments/[id]/      PATCH toggle highlight on-air & hide comment
│       └── sync-sheets/route.ts Webhook handler untuk sync pendaftaran ke Google Sheets
├── components/                 layout/ (AppShell, Sidebar, Topbar), ui/ (Button, Card, Input, Modal, Badge, Toast)
├── hooks/                      useAdminStore, useToday
└── lib/                        comments-bus.ts, supabase.ts, data-store.ts, mock-data.ts, utils.ts
```

### Perintah Admin

```bash
cd admin

npm install              # Install dependencies
npm run dev              # Jalankan dev server Next.js (http://localhost:3000)
npm run build            # Build produksi Next.js
npm run lint             # Validasi ESLint Next.js
```

---

## 3. Server Infrastructure & Hosting Azure (`40.81.231.250`)

Server produksi cloud berbasis Ubuntu VM di Azure yang meng-hosting MediaMTX, Transcoder, dan Web Admin.

### Matriks Komponen: Mana yang Wajib Dideploy ke Server SSH?

| Komponen / Folder | Target Deployment | Status di Server SSH | Cara Deploy / Eksekusi |
|---|---|---|---|
| **`admin/`** | Server Azure VM (`40.81.231.250`) | **WAJIB** | Pull repo, `npm run build`, `pm2 restart radio-admin` (Port 3001) |
| **`streaming/`** | Server Azure VM (`40.81.231.250`) | **WAJIB** | Script Python `engine_visual.py` (hook auto-transcode MediaMTX) |
| **`mobile/`** | Perangkat Pengguna / Android APK | **JANGAN dideploy ke server** | Dikompilasi via CI/CD GitHub Actions / EAS, bukan dijalankan di VM |
| **`supabase/`** | Cloud Supabase Managed Cluster | **TIDAK di server SSH** | Migrasi skema & Edge Functions di-push langsung ke dashboard/CLI Supabase |

---

### SOP / Prosedur Push & Deploy ke Server SSH

Informasi Kredensial & Akses Server:
- **Host**: `40.81.231.250`
- **User**: `azureuser`
- **SSH Key Path (Lokal)**: `C:\Users\WORKPLUS\Downloads\icecast-server_key.pem`
- **Remote Repository Path**: `/home/azureuser/radio-multiplatform`
- **PM2 Service Name**: `radio-admin` (Next.js), `mediamtx` (MediaMTX)

#### 1. Perintah 1-Baris Cepat dari Terminal Lokal (Direkomendasikan untuk AI & Developer)
Jalankan perintah ini langsung dari PowerShell atau terminal lokal untuk memperbarui kodingan, me-rebuild, dan me-restart servis di server:

```powershell
ssh -i "C:\Users\WORKPLUS\Downloads\icecast-server_key.pem" -o StrictHostKeyChecking=no azureuser@40.81.231.250 "cd /home/azureuser/radio-multiplatform && git pull origin master && cd admin && npm run build && pm2 restart radio-admin"
```

#### 2. Prosedur Manual Step-by-Step via SSH
Jika perlu masuk ke sesi terminal server untuk debugging atau pengecekan mendalam:

```bash
# 1. Masuk ke server
ssh -i "C:\Users\WORKPLUS\Downloads\icecast-server_key.pem" azureuser@40.81.231.250

# 2. Masuk ke direktori repositori
cd /home/azureuser/radio-multiplatform

# 3. Tarik commit terbaru dari GitHub
git pull origin master

# 4. Masuk ke folder admin & build Next.js produksi
cd admin
npm install # Jalankan hanya jika ada perubahan dependencies
npm run build

# 5. Restart proses PM2
pm2 restart radio-admin

# 6. Verifikasi status
pm2 status
pm2 logs radio-admin --lines 20
```

#### 3. Jika Memperbarui Skrip Transcoder (`streaming/engine_visual.py`)
Skrip Python transcoder dijalankan otomatis oleh hook `runOnReady` MediaMTX setiap kali vMix melakukan RTMP streaming. Jika ada perbaikan pada `engine_visual.py`:
```powershell
ssh -i "C:\Users\WORKPLUS\Downloads\icecast-server_key.pem" -o StrictHostKeyChecking=no azureuser@40.81.231.250 "cd /home/azureuser/radio-multiplatform && git pull origin master && chmod +x streaming/engine_visual.py && pm2 restart mediamtx"
```

---

### Konfigurasi Servis & Port Server

- **Web Admin Dashboard**:
  - Dijalankan menggunakan PM2: `radio-admin` (Port `3001`, URL: `http://40.81.231.250:3001/`).
- **MediaMTX Media Server**:
  - Dijalankan menggunakan PM2: `mediamtx`.
  - Port Ingest RTMP: `1935` (`rtmp://40.81.231.250:1935/gaulfm`).
  - Port WHEP WebRTC: `8889` (`http://40.81.231.250:8889/gaulfm_webrtc/whep`).
  - Port HLS: `8888` (`http://40.81.231.250:8888/gaulfm/index.m3u8`).
- **FFmpeg Auto-Transcoder (`streaming/engine_visual.py`)**:
  - Dipicu otomatis oleh hook MediaMTX `runOnReady` saat vMix mulai melakukan stream ke path `gaulfm`.
  - Mentranscode audio AAC ke Opus 128k dengan resample PTS (`aresample=async=1000`) dan mempublikasikannya ke path `gaulfm_webrtc` secara real-time.

---

## 4. Database & Backend (`supabase/`)

Arsitektur database berbasis **Supabase (PostgreSQL 15+)**:

- **`supabase/schema.sql`**:
  - DDL tabel: `now_playing`, `programs`, `news`, `profiles`, `banners`, `live_comments`.
  - Composite indexes (`idx_programs_day_time`, `idx_news_published`, `idx_profiles_city`, `idx_live_comments_active`).
  - Row Level Security (RLS) policies untuk akses publik, user terdaftar, dan admin.
  - Trigger otomatis `on_auth_user_created` untuk sinkronisasi data dari `auth.users` ke `public.profiles`.
  - Supabase Realtime publication untuk update instan `now_playing` dan `live_comments`.
- **`supabase/seed.sql`**:
  - Data dummy awal: Jadwal lengkap 7 hari (Senin–Minggu), status on-air aktif, contoh berita Semarang, dan banner promo.
- **`supabase/functions/sync-wp-news/index.ts`**:
  - Supabase Edge Function (Deno) untuk cron job sinkronisasi otomatis artikel dari REST API WordPress (`https://radiogaulfmsmg.com/wp-json/wp/v2/posts`).

---

## 5. CI/CD Otomatisasi APK (`.github/workflows/build-android.yml`)

Workflow GitHub Actions untuk kompilasi APK otomatis:
- **Trigger**: Push ke branch `master`/`main` yang mengubah folder `mobile/**` atau manual via `workflow_dispatch`.
- **Environment**: Ubuntu Latest, Java 17 Temurin, Node.js 22, Android SDK.
- **Langkah Kerja**:
  1. `npm install` (otomatis mengeksekusi `patch-package`).
  2. `npx expo prebuild --platform android --no-install`.
  3. `./gradlew assembleDebug --no-daemon --stacktrace`.
  4. Upload artifact: `gaulfm-android-debug-apk`.

---

## 6. Standar Kode & Konvensi

1. **Timezone WIB (UTC+7)**: Seluruh perhitungan waktu siaran, on-air, dan filter jadwal wajib menggunakan helper WIB (`mobile/src/utils/datetime.ts`) dan tidak bergantung pada timezone lokal perangkat.
2. **Demo Mode Resilience**: Seluruh hook data di mobile dan admin wajib memiliki fallback aman ke mock data jika kredensial Supabase belum dikonfigurasi.
3. **Immutability & State Management**: Jangan mengubah state secara langsung; gunakan aksi store Zustand dan copy object baru.
4. **Error Handling**: Setiap call jaringan harus memiliki blok try-catch dengan feedback visual yang jelas ke pengguna tanpa melempar unhandled crash.
