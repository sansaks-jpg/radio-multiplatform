# Project: Gaul FM Ecosystem Audit & Remediation

## Architecture
Ekosistem Gaul FM Semarang terdiri dari 3 pilar utama:
1. **Mobile App (`mobile/`)**: React Native Expo SDK 54, Zustand 5, TanStack Query v5, NativeWind v4 ("Gaul Neon Night"), Icecast streaming engine (react-native-track-player 4.1.2 & expo-audio fallback), MediaMTX WebRTC (WHEP) / HLS visual radio player dengan kontrol rotasi otomatis Landscape via `expo-screen-orientation`.
2. **Web Admin Dashboard (`admin/`)**: Next.js 16.2 App Router (Turbopack), Tailwind CSS v4, SheetJS (`xlsx`) listener export, `/api/sync-sheets` Google Sheets marketing webhook, `/streams` Streaming Orchestrator panel.
3. **Database & BaaS (`supabase/`)**: PostgreSQL schema, Row Level Security (RLS) policies, database triggers, realtime broadcast, dan Edge Functions (`sync-wp-news`).
4. **Cloud Streaming Infrastructure (Azure `40.81.231.250`)**: MediaMTX (RTMP, HLS, WebRTC WHEP), FFmpeg auto-transcoder (`engine_visual.py`), Next.js Web Admin hosting via PM2 (`radio-admin`, port 3001).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Icecast Live Streaming | Pemutaran live stream audio radio berkesinambungan | M1 | spec_report §3 |
| 2 | Background Playback & Lockscreen | Kontrol audio di background foreground service & lockscreen | M1 | spec_report §3 |
| 3 | Multi-Engine Fallback | RNTP native, Expo Audio fallback, Web Audio | M1 | spec_report §3 |
| 4 | MediaMTX WebRTC (WHEP) | Pemutaran visual radio ultra-rendah latensi (<0.3s) | M1 | spec_report §3 |
| 5 | HLS Stream Fallback | Video HLS via hls.js saat WebRTC WHEP gagal | M1 | spec_report §3 |
| 6 | YouTube Studio Fallback | Modal sheet siaran visual YouTube official | M1 | spec_report §3 |
| 7 | Persistent Mini Player | Bilah pemutar audio persisten di atas Bottom Tab Bar | M1 | spec_report §3 |
| 8 | Live Detail Sheet | Fullscreen sheet kontrol audio/visual, chat, program detail | M1 | spec_report §3 |
| 9 | Audio Mutual Exclusion | Pencegahan tabrakan audio ganda saat visual radio aktif | M1 | spec_report §3 |
| 10 | Visual Player Resource Cleanup | Pencegahan memory leak saat WebView & engine unmount | M1 | spec_report §3 |
| 11 | MediaMTX URL Alignment | Harmonisasi endpoint WebRTC/HLS di seluruh konfigurasi | M1 | spec_report §3 |
| 12 | Supabase RLS Authorization | Pengetatan RLS policy agar role authenticated tidak bebas mutasi | M2 | spec_report §3 |
| 13 | Admin Listener Data Access | RLS policy & proteksi agar admin terverifikasi dapat membaca profiles | M2 | spec_report §3 |
| 14 | Database Column Sync | Sinkronisasi nama kolom profiles (whatsapp_number, location_*) | M2 | spec_report §3 |
| 15 | Edge Function Security | Proteksi otorisasi dan error handling di sync-wp-news | M2 | spec_report §3 |
| 16 | Marketing Webhook Security | Validasi secret, sanitasi input, pencegahan leak PII di /api/sync-sheets | M2 | spec_report §3 |
| 17 | Supabase PostgreSQL Schema | Relational schema & composite index integritas DB | M2 | spec_report §3 |
| 18 | Supabase Realtime Publication | Broadcast event instan mutasi now_playing | M2 | spec_report §3 |
| 19 | Supabase Email Auth & Demo Mode | Autentikasi listener dengan fallback demo mode offline | M3 | spec_report §3 |
| 20 | Device & Location Harvester | Perekaman model HP, OS, dan koordinat GPS 1x saat daftar | M3 | spec_report §3 |
| 21 | Expo Push Notifications | Notifikasi pengingat acara & push alerts | M3 | spec_report §3 |
| 22 | Full-bleed Hero Banner | Karusel banner promo siaran edge-to-edge | M3 | spec_report §3 |
| 23 | On-Air & Up-Next Strip | Status siaran aktif real-time dengan clock WIB UTC+7 | M3 | spec_report §3 |
| 24 | Weekly 7-Day Timetable | Jadwal siaran 7 hari lengkap dengan empty & error states | M3 | spec_report §3 |
| 25 | Acara Reminders | Alarm pengingat jadwal lokal | M3 | spec_report §3 |
| 26 | WordPress Synced News & Cache | Feed berita Semarang dari WP REST API dengan offline cache | M3 | spec_report §3 |
| 27 | Offline News Reader | Pembaca artikel berita offline tanpa layar putih kosong | M3 | spec_report §3 |
| 28 | Listener Transparency & Profile UI | Layar akun pendengar, transparansi sensor, settings tema | M3 | spec_report §3 |
| 29 | Linting & Code Hygiene Cleanup | Pembersihan 19 warning ESLint pada mobile/ | M3 | spec_report §3 |
| 30 | Headless Terminal Verification | Verifikasi akhir tipe TypeScript, linting, dan build Next.js | M4 | spec_report §3 |
| 31 | Serverless Live Chat & Moderation | Real-time chat sync antara mobile & web admin, moderasi on-air, limit 50 pesan, layout rata kiri seragam | M2 | live_chat §1 |
| 32 | Cloud Ingest & Admin Hosting | Deployment Web Admin (port 3001) & MediaMTX di VM Azure via PM2, panel `/streams` untuk vMix & RadioBOSS | M5 | infra §1 |
| 33 | Anti-Stutter Audio Transcoding | Normalisasi PTS audio via `aresample=async=1000` dan Opus 128k pada transcoder `engine_visual.py` | M5 | streaming §2 |
| 34 | Edge-to-Edge 16:9 & Auto-Landscape | Tampilan 16:9 penuh tanpa cutoff samping, rotasi otomatis Landscape saat fullscreen via `expo-screen-orientation` | M5 | player §3 |
| 35 | Native Media Controls Suppression | Penyembunyian UI bawaan browser (durasi, pause, timeline bar) via container fullscreen & CSS webkit-media-controls | M5 | player §4 |
| 36 | Official Program Master Data & Artwork | Standardisasi data 3 program unggulan (jam siaran WIB, deskripsi, logo resmi) via `OFFICIAL_PROGRAM_INFO` | M7 | branding §1 |
| 37 | Gaul Squad Announcer Carousel | Integrasi daftar profil foto & nama 7 penyiar resmi di dalam lembar pemutar `LiveDetailSheet` | M7 | player §5 |
| 38 | Android ABI Split Optimization | Pemisahan binary APK (armeabi-v7a 32-bit, arm64-v8a 64-bit, universal) menghemat ukuran hingga ~70% | M7 | build §2 |
| 39 | Studio Quick-Action & Enhanced Up Next | Aksi "Nonton Radio" di Beranda serta kartu Up Next dengan badge WIB dan navigasi instan | M7 | home §2 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Audio & Visual Stream Stabilization (R2) | `mobile/src/services/audio/`, `mobile/src/components/player/`, `mobile/src/components/home/`, `mobile/src/services/visualStream.ts`, `mobile/app.config.ts` | Survey | COMPLETED |
| M2 | Supabase Security & Data Synchronization (R3) | `supabase/schema.sql`, `supabase/functions/sync-wp-news/`, `admin/src/app/api/sync-sheets/`, `admin/src/app/api/comments/`, `mobile/src/stores/authStore.ts`, `mobile/src/types/index.ts` | M1 | COMPLETED |
| M3 | Mobile UI/UX Completeness & Lint Cleanup (R1, R4) | `mobile/src/screens/`, `mobile/src/components/`, `mobile/src/hooks/`, `mobile/src/mocks/`, `mobile/src/services/comments.ts` | M2 | COMPLETED |
| M4 | Final Headless Terminal E2E Verification (R4) | Terminal verification (`mobile/` typecheck & lint, `admin/` lint & build) | M3 | COMPLETED |
| M5 | Cloud Hosting & Production Streaming Orchestration | Azure VM deployment (`admin/` PM2 port 3001, MediaMTX port 1935/8888/8889, `engine_visual.py`), 16:9 edge-to-edge & auto-landscape | M4 | COMPLETED |
| M6 | Google Auth & Listener Onboarding (v0.0.3) | Supabase Google OAuth, biodata form & returning user bypass, JIT permissions, dark mode splash theme | M5 | COMPLETED |
| M7 | Program Master Sync & ABI Split Release (v0.0.4) | Master program sync, announcer carousel, home studio action, ABI Split Android APKs (32-bit/64-bit/universal) | M6 | COMPLETED |

## Interface Contracts
### Audio Engine ↔ Visual Player
- `isVisualActive === true` -> Icecast stream audio WAJIB di-pause/stop (`stopLive()`). Tombol play Icecast di sheet dinonaktifkan / disembunyikan.
- `isVisualActive === false` / Modal Visual ditutup -> Icecast stream audio otomatis melanjutkan pemutaran jika sebelumnya dalam status aktif (`playing`).
- `VisualPlayerSheet` (YouTube) -> Saat modal terbuka, audio Icecast di-pause; saat modal ditutup, audio Icecast kembali di-resume jika sebelumnya aktif.

### Visual Radio ↔ Video Stream & Fullscreen Lifecycle
- **Audio Transcoder Pipeline**: vMix RTMP ingest (`rtmp://40.81.231.250:1935/gaulfm`) ditranscode otomatis oleh `engine_visual.py` dengan filter audio `-af aresample=async=1000:min_hard_comp=0.100000:first_pts=0` dan codec `libopus -b:a 128k -vbr on -application audio -cutoff 20000` ke path `gaulfm_webrtc`.
- **Client Jitter Buffer**: WebRTC receiver di `MediaMtxVisualPlayer.tsx` menggunakan `playoutDelayHint = 0.35` untuk memastikan pemutaran audio/video mulus tanpa packet drop.
- **Edge-to-Edge 16:9 Layout**: Container video membentang 100% selebar layar (`w-full aspect-[16/9]`) di mode live chat, tanpa batasan `minHeight`, menghilangkan terpotongnya sisi kanan.
- **Auto-Landscape Orientation**: Memasuki mode fullscreen memicu event `fullscreen_toggled` ke React Native yang menjalankan `ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE)`. Saat keluar, orientasi dikembalikan ke `PORTRAIT_UP`.
- **UI Bawaan Browser Disembunyikan**: Target `requestFullscreen` diarahkan ke pembungkus `#player-container` (bukan tag `<video>`) serta menerapkan CSS penonaktifan total untuk seluruh pseudo-elemen `::-webkit-media-controls*`. Hanya tombol fullscreen minimalis di sudut kanan bawah yang tampil dengan auto-hide 2.5 detik.

### Live Chat ↔ Serverless Sync & Moderasi
- **Hard-cap 50 Komentar**: Histori komentar dibatasi maksimal 50 pesan (`MAX_HISTORY_COMMENTS = 50`, `MAX_LIVE_COMMENTS = 50`) baik di backend Next.js maupun mobile client guna menghemat bandwidth dan konsumsi memori.
- **Tampilan Rata Kiri Seragam**: Seluruh pesan di `LiveDetailSheet.tsx` ditampilkan rata kiri (gaya live chat streaming YouTube/Twitch), dengan pembeda nama warna brand, avatar inisial, serta badge (*Studio* / *On Air*).
- **Moderasi & Broadcast Studio**: Admin dapat mem-pin/highlight komentar (*On Air*), menyembunyikan komentar tidak pantas (*Hide*), dan mengirim pesan resmi bertanda *Studio*.
- **Lifecycle-Aware Delta**: Mobile app hanya melakukan polling delta atau stream SSE ketika sheet live terbuka.

### Mobile Client ↔ Supabase Database (`profiles`)
- Database Schema DDL: `whatsapp_number` (VARCHAR 30), `location_city` (VARCHAR 100), `location_lat` (DECIMAL 9,6), `location_lng` (DECIMAL 9,6).
- Client Payload: Serializer di `mobile/src/services/supabase.ts` dan `authStore.ts` wajib memetakan properti model `whatsapp`, `city`, `latitude`, `longitude` ke nama kolom skema database tersebut agar tidak memicu error column mismatch.

### Supabase RLS ↔ Roles
- `public.now_playing`, `public.programs`, `public.news`, `public.banners`:
  - `SELECT`: Diizinkan untuk publik (`anon`, `authenticated`, `service_role`).
  - `INSERT`, `UPDATE`, `DELETE`: HANYA diizinkan untuk `service_role` atau pengguna dengan klaim admin (`auth.jwt()->'app_metadata'->>'role' = 'admin'`). Pengguna biasa (`authenticated` listener) TIDAK memiliki hak mutasi.
- `public.live_comments`:
  - `SELECT`: Publik (komentar `is_hidden = false`).
  - `INSERT`: Publik (pengguna / pendengar).
  - `UPDATE`, `DELETE`: HANYA `service_role` atau pengguna dengan klaim admin.
- `public.profiles`:
  - `SELECT`: Pemilik profil (`auth.uid() = id`), admin (`auth.jwt()->'app_metadata'->>'role' = 'admin'`), dan `service_role`.
  - `INSERT` / `UPDATE`: Pemilik profil (`auth.uid() = id`) dan `service_role`.

## Code Layout
- `mobile/src/screens/`: Splash, Onboarding, auth/, home/, schedule/, news/, profile/
- `mobile/src/components/`: player/ (MiniPlayer, LiveDetailSheet, MediaMtxVisualPlayer, LiveBadge), home/ (VisualPlayerSheet, VisualLiveCard, HomeHero, HomeHeroBanner), ui/
- `mobile/src/services/audio/`: playerEngine.ts, playerEngine.rntp.ts, playerEngine.expoAudio.ts, trackPlayerService.ts, streamResolver.ts
- `mobile/src/services/`: visualStream.ts, comments.ts, supabase.ts, notifications.ts, location.ts, deviceInfo.ts
- `admin/src/app/`: layout.tsx, page.tsx, chat/, now-playing/, streams/, schedule/, news/, banners/, users/, api/comments/, api/sync-sheets/
- `admin/src/lib/`: comments-bus.ts, supabase.ts, data-store.ts, mock-data.ts, utils.ts
- `streaming/`: engine_visual.py (FFmpeg auto-transcoding pipeline for vMix RTMP to WebRTC/Opus)
- `supabase/`: schema.sql, seed.sql, functions/sync-wp-news/
