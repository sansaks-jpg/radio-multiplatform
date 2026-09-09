# Gaul FM Semarang — Mobile App (MVP)

React Native (Expo SDK 54 + TypeScript) listener app per `MOBILE_FRONTEND_PLAN.md`.

## Stack

| Layer | Choice |
| --- | --- |
| Runtime | Expo SDK ~54, TypeScript, development builds |
| Styling | NativeWind v4 (Tailwind) |
| Navigation | React Navigation (Root → Auth stack → Main tabs) |
| Player state | Zustand |
| Server state | TanStack Query v5 + AsyncStorage persister (offline news) |
| Backend | Supabase (auth + data) — optional in dev, see below |
| Live audio | react-native-track-player (background + lock screen) |
| Visual Radio | MediaMTX WebRTC (WHEP) + HLS fallback via react-native-webview |
| Orientation | expo-screen-orientation (auto landscape lock on fullscreen) |

## Quick start

```bash
npm install
cp .env.example .env        # optional — fill Supabase creds
npm run dev                 # start Metro / Expo dev server
```

**No Supabase?** The app runs in demo mode: bundled mock schedule/news/now-playing
data and a local demo sign-in (any email + password).

## Running on a device

`react-native-track-player` is a native module — it does **not** run in Expo Go.

```bash
npx expo prebuild             # generates android/ and ios/ (once)
npx expo run:android          # or run:ios
# or create a hosted dev build:
npx eas build --profile development --platform android
```

Then start the dev server (`npm run dev`) and open the app from the dev build.

## Stream notes

- Playlist: `http://27.50.19.173:9000/gaulfm.m3u` → resolves to `http://27.50.19.173:9000/gaulfm`
- Resolution happens once per play session (`streamResolver.ts`) with fallback to the direct URL.
- The stream is plain HTTP: Android cleartext is enabled in `app.config.ts` (`usesCleartextTraffic`).
- Treated as live radio: no seek bar, no scrub, no next track.
- Web preview (`npm run web`) uses an HTMLAudioElement fallback engine — UI demo only, no background playback.
- **Visual Radio (WHEP / WebRTC)**:
  - WHEP Endpoint: `http://40.81.231.250:8889/gaulfm_webrtc/whep` (latensi <0.3 detik).
  - HLS Fallback: `http://40.81.231.250:8888/gaulfm/index.m3u8`.
  - Audio Switching: Membuka visual radio otomatis menghentikan audio Icecast (`stopLive()`) agar tidak tumpang tindih.
  - Tampilan 16:9 Edge-to-Edge: Membentang penuh dari tepi ke tepi layar (`w-full aspect-[16/9]`) di mode live chat, bebas cutoff sisi kanan.
  - Fullscreen Auto-Landscape: Otomatis mengunci ke Landscape saat mode layar penuh, dan kembali ke Portrait saat keluar.
  - UI Bersih: Kontrol bawaan browser (garis timeline, teks durasi, tombol pause) disembunyikan via container requestFullscreen dan CSS `::-webkit-media-controls*`. Hanya tombol fullscreen minimalis di sudut kanan bawah dengan auto-hide 2.5 detik.
- **Live Chat**: Real-time comments tersinkronisasi dengan Web Admin (`/api/comments`), dibatasi maksimal 50 komentar, tata letak rata kiri seragam (YouTube/Twitch live chat style), hemat bandwidth (aktif hanya saat Live sheet terbuka).

## Structure

```
src/
├── navigation/   RootNavigator, AuthStack, MainTabs (Mini Player above tab bar)
├── screens/      Splash, auth/, home/, schedule/, news/, profile/, common/
├── components/   player/, schedule/, news/, ui/
├── stores/       playerStore (Zustand), authStore
├── services/     audio/ (engine + stream resolver), visualStream, comments, supabase, device, location, notifications
├── hooks/        usePlayerControls, useNowPlaying, usePrograms, useNews, useProfile, useLiveComments
├── mocks/        demo fixtures (used when Supabase is not configured)
├── theme/        design tokens
└── types/        domain + navigation types
```

## Scripts

- `npm run dev` / `npm start` — Expo dev server
- `npm run android` / `npm run ios` / `npm run web`
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` — `expo lint`
