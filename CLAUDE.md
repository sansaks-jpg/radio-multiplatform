# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Gaul FM Semarang** — Mobile radio ecosystem. Two workspaces in one repo:

- **`mobile/`** — React Native Expo (SDK 54) listener app. Android/iOS/Web.
- **`admin/`** — Next.js 16 App Router web dashboard for admins/broadcasters.
- **`PRD.md`** — Product Requirements Document (feature source of truth).
- **`MOBILE_FRONTEND_PLAN.md`** — Mobile implementation plan (6 sprints).

---

## Mobile (`mobile/`)

### Stack

| Layer | Choice |
|-------|---------|
| Runtime | Expo SDK 54, TypeScript 5.9, development builds (`newArchEnabled: true` for Reanimated 4 / Worklets) |
| Styling | NativeWind v4 (Tailwind 3.4) + CSS class-based |
| Navigation | React Navigation 7 (Root → Auth → BottomTabs) |
| Player state | Zustand 5 |
| Server state | TanStack Query 5 + AsyncStorage persister (offline news ≥15 articles) |
| Backend | Supabase (auth + data) — optional, falls back to demo mode |
| Live audio | react-native-track-player (v4.1.2 native), expo-audio (fallback), HTMLAudioElement (web) |
| Visual radio | MediaMTX (WebRTC / WHEP Mode <0.3s latency + HLS fallback via react-native-webview) |

### Source Structure (`mobile/src/`)

```
src/
├── navigation/    RootNavigator, AuthStack, MainTabs (Mini Player above tab bar)
├── screens/       Splash, auth/ (Login, Register, ForgotPassword, ResetPassword), home/, schedule/, news/, profile/ (AppSettings), common/
├── components/    player/ (LiveBadge, LiveDetailSheet, MediaMtxVisualPlayer), schedule/, news/, ui/ (Screen, Button, Card, TextInput, etc.)
├── stores/        playerStore (Zustand), authStore (Zustand), reminderStore (Zustand + AsyncStorage)
├── services/
│   ├── audio/     playerEngine.ts (dispatcher), engineTypes.ts, streamResolver.ts
│   │              playerEngine.rntp.ts (RNTP), playerEngine.expoAudio.ts, playerEngine.web.ts
│   │              trackPlayerService.ts (orchestrator with operation generation token), playbackService.rntp.ts
│   ├── visualStream.ts (MediaMTX WHEP/HLS stream resolver)
│   ├── supabase.ts, deviceInfo.ts, location.ts, notifications.ts
├── hooks/         usePlayerControls, useNowPlaying, usePrograms, useNews, useProfile, useBanners, useYouTubeVisual
├── mocks/         nowPlaying.ts, programs.ts, news.ts, banners.ts, comments.ts
├── theme/         tokens.ts (colors, spacing, radius, glow — "Gaul Neon Night")
├── types/         index.ts (domain types + navigation param lists)
└── utils/         html.ts (minimal HTML→plain), datetime.ts (pure UTC+7 WIB-aware helpers)
```

### Audio & Visual Engine Architecture

#### Audio Engine (Icecast Stream)
Uses a strategy pattern with runtime dispatch:
1. **`engineTypes.ts`** — `PlayerEngine` interface (setup, loadAndPlay, play, pause, stop, updateMetadata).
2. **`playerEngine.ts`** — Runtime dispatcher: picks engine by platform and native module availability.
3. **`playerEngine.rntp.ts`** — Primary engine: `react-native-track-player` 4.1.2 (background + lock screen controls).
4. **`trackPlayerService.ts`** — Orchestrator with `currentOperationGeneration` token to prevent slow play vs pause/stop race conditions.
5. **`streamResolver.ts`** — Resolves `.m3u` playlist with size validation (≤64KB), status checks, and HTML error prevention.

Audio Stream Contract: `http://27.50.19.173:9000/gaulfm.m3u` (Icecast progressive HTTP stream).

#### Visual Radio Engine (MediaMTX WebRTC / WHEP)
Provides ultra low-latency (<0.3s) visual radio stream:
1. **`visualStream.ts`** — Resolves MediaMTX WHEP (`http://40.81.231.250:8889/gaulfm_webrtc/whep`) and HLS fallback (`http://40.81.231.250:8888/gaulfm/index.m3u8`).
2. **`MediaMtxVisualPlayer.tsx`** — Inline player using `react-native-webview` for HTML5 WHEP WebRTC playback.
3. **Audio-Visual Seamless Toggle**: In `LiveDetailSheet.tsx` and `HomeHero.tsx`, toggling to Visual Radio automatically pauses the Icecast audio stream (`pauseLive()`) to prevent audio duplication, and resuming audio stops the visual video player.

### Demo Mode

Without Supabase credentials, the app runs fully on mock data:
- `mocks/nowPlaying.ts`, `mocks/programs.ts`, `mocks/news.ts`, `mocks/banners.ts`
- Demo auth: login with any email + password
- Hooks automatically use mock data when `isSupabaseConfigured === false`

### Commands

```bash
cd mobile

npm install              # Install dependencies + patch-package (postinstall)
cp .env.example .env     # Optional — fill in Supabase credentials

npm run dev              # Expo dev server (Metro)
npm run web              # Expo web preview (UI demo)
npm run android          # npx expo run:android (dev build)

npm run typecheck        # tsc --noEmit (type checking)
npm run lint             # npx expo lint
```

**Note:** `react-native-track-player` is a native module — requires `newArchEnabled: false` in `app.config.ts` and a development build (`npx expo run:android` or EAS build).

### Design Tokens

"Gaul Neon Night" / **Studio Dock** — near-black `#0A0F0B` with green undertone, brand green `#2EE06D`, orange `#FF9E2C` for live/highlight, red `#FF5252` for LIVE badge/error. Defined in `theme/tokens.ts` and `tailwind.config.js` (keep in sync manually). Spacing includes `md:12`, `base:16`, `2xl:40`; `dock` metrics for Mini+Tabs content insets. **Glow policy:** brand/orange shadow only on primary Play and main CTA — not on cards/rows.

### Key Patterns

- **Mini Player** is global chrome above the tab bar (`MainTabs.tsx`), hidden on Home or when stream hasn't started.
- **WIB Timezone (UTC+7)** — All date/time, on-air detection, and day-of-week indices use pure UTC+7 calculations via `getWibParts()` in `utils/datetime.ts`. Supports overnight shows crossing midnight (e.g. 23:00–02:00).
- **Persistent Reminders** — Managed via `useReminderStore` (Zustand + AsyncStorage) synchronized with `expo-notifications`.
- **Auth & Password Recovery** — Handled via `AuthStack` including `ResetPasswordScreen` and `gaulfm://reset-password` deep-links.
- **Offline News** — TanStack Query cache persisted to AsyncStorage (≥15 articles, NFR 7.3).

---

## Admin (`admin/`)

### Stack

| Layer | Choice |
|-------|---------|
| Runtime | Next.js 16.2, App Router, TypeScript |
| Styling | Tailwind CSS v4 + next-themes (dark mode) |
| UI | shadcn-style components (Card, Sidebar, ThemeProvider) |
| Backend | Supabase JS client |
| Excel | SheetJS (xlsx) for listener data export |
| Google Sheets | Planned: API route `/api/sync-sheets` |

### Source Structure (`admin/src/`)

```
src/
├── app/
│   ├── layout.tsx        RootLayout + ThemeProvider + Sidebar
│   ├── page.tsx          Dashboard grid (4 panel cards)
│   └── globals.css       Tailwind v4
├── components/
│   ├── dashboard/
│   │   ├── NowPlayingSwitcher.tsx   Update current broadcast info
│   │   ├── ScheduleEditor.tsx       CRUD program schedule
│   │   ├── NewsManager.tsx          Sync news from WordPress
│   │   └── UserTrackingTable.tsx    Listener data + Excel export
│   ├── layout/Sidebar.tsx
│   └── ui/               Card, theme-provider
└── lib/
    ├── supabase.ts       Supabase client
    └── utils.ts          cn() helper (clsx + tailwind-merge)
```

### Commands

```bash
cd admin
npm run dev          # Next.js dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
```

**Warning:** This Next.js version has breaking changes — read `node_modules/next/dist/docs/` before writing any code (see `admin/AGENTS.md`).

---

## Project Documents (Root Level)

| File | Content |
|------|---------|
| `PRD.md` | Full MVP spec: features, database schema, architecture, 3-phase roadmap |
| `MOBILE_FRONTEND_PLAN.md` | Mobile implementation details: 6 sprints, UI spec per screen, acceptance criteria |
| `mobile/README.md` | Quick start + stack + structure |
| `admin/README.md` | Bootstrap Next.js default |

---

## Database (Supabase)

Main tables: `now_playing`, `programs`, `news`, `profiles`.

- `profiles` — auto-filled via trigger/upsert on registration; fields: full_name, email, whatsapp, device_os, device_model, lat/lng, city, push_token, last_login
- `now_playing` — single-row table, updated by admin via Web Admin
- `programs` — weekly schedule, `day_of_week` (0=Sun..6=Sat), `start_time`/`end_time` format "HH:mm"
- `news` — synced from WordPress via Supabase Edge Function (cron job); `wp_post_id` unique

---

## Style & Convention

- **Indonesian** or **English** for code comments & documentation as specified per prompt.
- **NativeWind classes** for mobile styling (Tailwind utility classes via `className`).
- **JSDoc** on public components/functions — include plan references like `(plan §2.5)`.
- **Error handling**: user-facing error views with retry buttons, `console.warn` with `[GaulFM]` prefix for debugging.
- **TypeScript strict mode** enabled (`"strict": true` in tsconfig).
- **Mock fallback**: Every hook falls back to mock data when Supabase is not configured.
