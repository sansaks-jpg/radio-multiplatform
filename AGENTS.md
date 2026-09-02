# AGENTS.md

Panduan panduan teknis dan operasional untuk agen AI / pengembang pada repositori **Gaul FM Semarang**.

## Project Overview

**Gaul FM Semarang** adalah ekosistem aplikasi radio siaran langsung multi-platform yang mencakup:

- **`mobile/`** — Aplikasi mobile pendengar (React Native Expo SDK 54, Android/iOS/Web).
- **`admin/`** — Web Dashboard Admin & Penyiar (Next.js 16.2 App Router, Tailwind CSS v4).
- **`supabase/`** — Skema database PostgreSQL, RLS policies, seed dummy data, dan Supabase Edge Functions.
- **`.github/workflows/`** — Otomatisasi CI/CD GitHub Actions untuk build APK Android.
- **`PRD.md`** — Product Requirements Document (sumber kebenaran arsitektur dan spesifikasi fitur).

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
| Push Notifications | `expo-notifications` | Pengingat jadwal siaran & notifikasi berita |

### Source Structure (`mobile/src/`)

```
src/
├── navigation/    RootNavigator, AuthStack, MainTabs (Mini Player di atas tab bar)
├── screens/       Splash, Onboarding, auth/ (Login, Register, Forgot, Reset), home/, schedule/, news/, profile/
├── components/    player/ (LiveBadge, LiveDetailSheet, MediaMtxVisualPlayer, MiniPlayer), schedule/, news/, ui/
├── stores/        playerStore, authStore, reminderStore, themeStore, toastStore
├── services/      audio/ (playerEngine, trackPlayerService, streamResolver), visualStream, supabase, notifications, location, deviceInfo
├── hooks/         usePlayerControls, useNowPlaying, usePrograms, useNews, useProfile, useBanners
├── mocks/         nowPlaying, programs, news, banners, comments (Data dummy fallback)
├── theme/         tokens.ts, ThemeRoot.tsx ("Gaul Neon Night")
├── types/         index.ts, assets.d.ts
└── utils/         datetime.ts (WIB UTC+7 helpers), html.ts
```

### Audio & Visual Engine Contracts

1. **Audio Live Stream (Icecast Progressive HTTP)**:
   - Playlist URL: `http://27.50.19.173:9000/gaulfm.m3u`
   - Orchestration: `trackPlayerService.ts` menggunakan token generasi operasi (`currentOperationGeneration`) untuk mencegah race condition play/pause.
   - Patch: `patches/react-native-track-player+4.1.2.patch` menyelesaikan masalah Kotlin 2.x null-safety pada `MusicModule.kt` dan background media session di Android 13+.
2. **Visual Radio (MediaMTX WHEP/WebRTC)**:
   - WHEP Endpoint: `http://40.81.231.250:8889/gaulfm_webrtc/whep`
   - HLS Fallback: `http://40.81.231.250:8888/gaulfm/index.m3u8`
   - Audio Switching: Mengaktifkan visual radio otomatis menghentikan streaming audio Icecast agar tidak terjadi audio ganda.

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

### Source Structure (`admin/src/`)

```
src/
├── app/
│   ├── layout.tsx              RootLayout + ThemeProvider + AppShell
│   ├── page.tsx                Dashboard overview (Now Playing, Stats, Schedule Quick View)
│   ├── now-playing/page.tsx    Broadcaster panel untuk update live track & DJ on-air
│   ├── schedule/page.tsx       CRUD master jadwal siaran 7 hari
│   ├── news/page.tsx           Sinkronisasi berita WordPress & editor artikel
│   ├── banners/page.tsx        Manajemen banner promosi mobile app
│   ├── users/page.tsx          Tabel data pendengar & export Excel (.xlsx)
│   └── api/sync-sheets/route.ts Webhook handler untuk sync pendaftaran ke Google Sheets
├── components/                 layout/ (AppShell, Sidebar, Topbar), ui/ (Button, Card, Input, Modal, Badge, Toast)
├── hooks/                      useAdminStore, useToday
└── lib/                        supabase.ts, data-store.ts, mock-data.ts, utils.ts
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

## 3. Database & Backend (`supabase/`)

Arsitektur database berbasis **Supabase (PostgreSQL 15+)**:

- **`supabase/schema.sql`**:
  - DDL tabel: `now_playing`, `programs`, `news`, `profiles`, `banners`.
  - Composite indexes (`idx_programs_day_time`, `idx_news_published`, `idx_profiles_city`).
  - Row Level Security (RLS) policies untuk akses publik, user terdaftar, dan admin.
  - Trigger otomatis `on_auth_user_created` untuk sinkronisasi data dari `auth.users` ke `public.profiles`.
  - Supabase Realtime publication untuk update instan `now_playing`.
- **`supabase/seed.sql`**:
  - Data dummy awal: Jadwal lengkap 7 hari (Senin–Minggu), status on-air aktif, contoh berita Semarang, dan banner promo.
- **`supabase/functions/sync-wp-news/index.ts`**:
  - Supabase Edge Function (Deno) untuk cron job sinkronisasi otomatis artikel dari REST API WordPress (`https://radiogaulfmsmg.com/wp-json/wp/v2/posts`).

---

## 4. CI/CD Otomatisasi APK (`.github/workflows/build-android.yml`)

Workflow GitHub Actions untuk kompilasi APK otomatis:
- **Trigger**: Push ke branch `master`/`main` yang mengubah folder `mobile/**` atau manual via `workflow_dispatch`.
- **Environment**: Ubuntu Latest, Java 17 Temurin, Node.js 22, Android SDK.
- **Langkah Kerja**:
  1. `npm install` (otomatis mengeksekusi `patch-package`).
  2. `npx expo prebuild --platform android --no-install`.
  3. `./gradlew assembleDebug --no-daemon --stacktrace`.
  4. Upload artifact: `gaulfm-android-debug-apk`.

---

## 5. Standar Kode & Konvensi

1. **Timezone WIB (UTC+7)**: Seluruh perhitungan waktu siaran, on-air, dan filter jadwal wajib menggunakan helper WIB (`mobile/src/utils/datetime.ts`) dan tidak bergantung pada timezone lokal perangkat.
2. **Demo Mode Resilience**: Seluruh hook data di mobile dan admin wajib memiliki fallback aman ke mock data jika kredensial Supabase belum dikonfigurasi.
3. **Immutability & State Management**: Jangan mengubah state secara langsung; gunakan aksi store Zustand dan copy object baru.
4. **Error Handling**: Setiap call jaringan harus memiliki blok try-catch dengan feedback visual yang jelas ke pengguna tanpa melempar unhandled crash.
