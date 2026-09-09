# Project: Gaul FM Ecosystem Audit & Remediation

## Architecture
Ekosistem Gaul FM Semarang terdiri dari 3 pilar utama:
1. **Mobile App (`mobile/`)**: React Native Expo SDK 54, Zustand 5, TanStack Query v5, NativeWind v4 ("Gaul Neon Night"), Icecast streaming engine (react-native-track-player 4.1.2 & expo-audio fallback), MediaMTX WebRTC (WHEP) / HLS visual radio player.
2. **Web Admin Dashboard (`admin/`)**: Next.js 16.2 App Router (Turbopack), Tailwind CSS v4, SheetJS (`xlsx`) listener export, `/api/sync-sheets` Google Sheets marketing webhook.
3. **Database & BaaS (`supabase/`)**: PostgreSQL schema, Row Level Security (RLS) policies, database triggers, realtime broadcast, dan Edge Functions (`sync-wp-news`).

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

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Audio & Visual Stream Stabilization (R2) | `mobile/src/services/audio/`, `mobile/src/components/player/`, `mobile/src/components/home/`, `mobile/src/services/visualStream.ts`, `mobile/app.config.ts` | Survey | COMPLETED |
| M2 | Supabase Security & Data Synchronization (R3) | `supabase/schema.sql`, `supabase/functions/sync-wp-news/`, `admin/src/app/api/sync-sheets/`, `mobile/src/stores/authStore.ts`, `mobile/src/types/index.ts` | M1 | COMPLETED |
| M3 | Mobile UI/UX Completeness & Lint Cleanup (R1, R4) | `mobile/src/screens/`, `mobile/src/components/`, `mobile/src/hooks/`, `mobile/src/mocks/` | M2 | COMPLETED |
| M4 | Final Headless Terminal E2E Verification (R4) | Terminal verification (`mobile/` typecheck & lint, `admin/` lint & build) | M3 | COMPLETED |

## Interface Contracts
### Audio Engine ↔ Visual Player
- `isVisualActive === true` -> Icecast stream audio WAJIB di-pause. Tombol play Icecast di sheet dinonaktifkan / disembunyikan.
- `isVisualActive === false` / Modal Visual ditutup -> Icecast stream audio otomatis melanjutkan pemutaran jika sebelumnya dalam status aktif (`playing`).
- `VisualPlayerSheet` (YouTube) -> Saat modal terbuka, audio Icecast di-pause; saat modal ditutup, audio Icecast kembali di-resume jika sebelumnya aktif.

### Mobile Client ↔ Supabase Database (`profiles`)
- Database Schema DDL: `whatsapp_number` (VARCHAR 30), `location_city` (VARCHAR 100), `location_lat` (DECIMAL 9,6), `location_lng` (DECIMAL 9,6).
- Client Payload: Serializer di `mobile/src/services/supabase.ts` dan `authStore.ts` wajib memetakan properti model `whatsapp`, `city`, `latitude`, `longitude` ke nama kolom skema database tersebut agar tidak memicu error column mismatch.

### Supabase RLS ↔ Roles
- `public.now_playing`, `public.programs`, `public.news`, `public.banners`:
  - `SELECT`: Diizinkan untuk publik (`anon`, `authenticated`, `service_role`).
  - `INSERT`, `UPDATE`, `DELETE`: HANYA diizinkan untuk `service_role` atau pengguna dengan klaim admin (`auth.jwt()->'app_metadata'->>'role' = 'admin'`). Pengguna biasa (`authenticated` listener) TIDAK memiliki hak mutasi.
- `public.profiles`:
  - `SELECT`: Pemilik profil (`auth.uid() = id`), admin (`auth.jwt()->'app_metadata'->>'role' = 'admin'`), dan `service_role`.
  - `INSERT` / `UPDATE`: Pemilik profil (`auth.uid() = id`) dan `service_role`.

## Code Layout
- `mobile/src/screens/`: Splash, Onboarding, auth/, home/, schedule/, news/, profile/
- `mobile/src/components/`: player/ (MiniPlayer, LiveDetailSheet, MediaMtxVisualPlayer, LiveBadge), home/ (VisualPlayerSheet, VisualLiveCard, HomeHero, HomeHeroBanner), ui/
- `mobile/src/services/audio/`: playerEngine.ts, playerEngine.rntp.ts, playerEngine.expoAudio.ts, trackPlayerService.ts, streamResolver.ts
- `mobile/src/services/`: visualStream.ts, supabase.ts, notifications.ts, location.ts, deviceInfo.ts
- `admin/src/app/`: layout.tsx, page.tsx, now-playing/, schedule/, news/, banners/, users/, api/sync-sheets/
- `supabase/`: schema.sql, seed.sql, functions/sync-wp-news/
