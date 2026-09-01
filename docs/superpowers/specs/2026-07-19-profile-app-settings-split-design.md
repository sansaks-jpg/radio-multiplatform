# Design: Profile hub vs App settings split

<!--
Importers/callers: ProfileNavigator (MainTabs), ProfileScreen gear → AppSettings, AppSettings → About.
API: ProfileStackParamList + AppSettings: undefined; no data schema changes (Profile type, themeStore unchanged).
User: "tolong lakukan perombakan ui/ux untuk bagian profile. tolong pisahkan antara settings profile dan settings app. pakai skiils yg ada." + gear + "Tema + notifikasi stub + About + versi"
-->

**Date:** 2026-07-19  
**App:** Gaul FM mobile (Expo SDK 54)  
**Status:** Approved for implementation after user review of this spec  

## Problem

`ProfileScreen` mixes identity/account data, device transparency, **app** preferences (theme), About, and logout in one long scroll. Users cannot tell “my data” from “app settings.”

## Design system authority

**Source of truth for visual language:** `mobile/DESIGN.md` (Sonic Pulse) + mapped runtime tokens in `src/theme/tokens.ts`.

| DESIGN.md rule | Profile application |
|----------------|---------------------|
| High-energy modern, dark studio surfaces | Hub + settings on `bg` / `surface` / `surface2` tonal stack — no heavy shadows |
| Gaul Green primary | Avatar fill, section accents, gear focus, selected theme chips |
| On-Air Orange secondary | City chip, device/location tone, WhatsApp row accent only |
| Accent Red tertiary | Logout / danger only — never decorative |
| Plus Jakarta Sans | Existing font weights; titles extrabold/tight; section labels uppercase tracking |
| 8px rhythm, mobile margin 16px | `Screen` horizontal padding; section gaps `mt-6` / card internal `py-3` |
| Cards: tonal surface, rounded-lg/xl | Reuse `Card` (`rounded-card bg-surface`) — minimal border; device card may use `surface2` for Level 2 raised |
| Elevation = tonal layers | Level 0 bg → Level 1 account cards → Level 2 device / raised controls |
| Glow only on primary Play / main CTA | **No glow** on gear, rows, or logout |
| Pill chips for status | City chip full-round (`rounded-full`) orange soft fill |

Do **not** invent new colors outside `tokens.ts` / NativeWind theme classes.

## Goals

- Keep the **bottom tab navbar unchanged** (still “Profil”).
- Separate **profile/account content** from **app settings**.
- Add a **gear icon** on the Profile hub that opens app settings.
- App settings include: **theme**, **notifications (permission + preference)**, **About**, **version**.
- Visuals strictly follow **Sonic Pulse / DESIGN.md** via existing primitives (`Screen`, `Card`, `ThemeModePicker`).

## Non-goals

- Server-driven remote push campaigns beyond storing Expo push token on profile.
- Edit-profile / change password flows.
- Moving logout into app settings (stays on Profile hub).
- Changing MainTabs icons/labels.
- New native modules or packages.

## Information architecture

```
MainTabs → Profile (stack)
  ProfileHome          # hub: identity + account + device + logout
  AppSettings          # gear: theme + notifications stub + About + version
  About                # existing
```

| Surface | Contains | Does not contain |
|---------|----------|------------------|
| **ProfileHome** | Hero (avatar initials, name, email, city chip); section **Akun** (name, email, WhatsApp); section **Perangkat & Lokasi** + transparency note; **Keluar** | Theme picker, About row, version footer as primary chrome |
| **AppSettings** | Section **Tampilan** (`ThemeModePicker` + helper); section **Notifikasi** (Switch + OS permission + system settings deep link); section **Tentang** → navigate About; version line | Account fields, device fields, logout |
| **About** | Unchanged brand blurb + studio contact deep links | — |

## Navigation

- `ProfileStackParamList`: add `AppSettings: undefined`.
- `ProfileNavigator`: register `AppSettings` screen.
- Profile hub header: title **Profil** left-aligned (current style) + **gear** `Pressable` top-right (`settings-outline`), `accessibilityLabel="Pengaturan aplikasi"`, navigates to `AppSettings`.
- AppSettings: back chevron + title **Pengaturan** (same pattern as AboutScreen header).
- About remains reachable only from AppSettings (remove About row from ProfileHome).

## UI detail (Sonic Pulse)

### ProfileHome header

```
[ Profil                    ⚙️ ]
```

- Title: `text-[22px] font-extrabold tracking-tight text-text` (headline impact, DESIGN typography).
- Gear: `settings-outline`, `min-h-11 min-w-11`, circle `bg-surface-2` + hairline `border-line/60`, icon `text` (not orange). Active opacity only — no glow.

### ProfileHome body

1. **Hero card** (`Card` / surface Level 1): avatar circle `bg-brand` + `text-onbrand` initials; name title-md/extrabold; email `text-text-dim`; city **pill** `bg-orange/10` + orange icon/text.
2. **Akun** — section label `label-sm` uppercase tracking-widest dim; rows icon in soft brand circle.
3. **Perangkat & Lokasi** — card `bg-surface-2` (raised Level 2); orange-tinted icons; disclaimer `text-[11px] text-text-dim`.
4. **Keluar** — own card or bottom row; icon circle `bg-live/10`, label `text-live` only (Accent Red reserved for danger).

### AppSettings

Header: back chevron in surface-2 circle (match About) + title **Pengaturan**.

1. **Tampilan** — `ThemeModePicker` (brand selected chips already DESIGN-aligned); helper dim.
2. **Notifikasi** — static row: icon `notifications-outline` in brand/10 circle; title + subtitle **Segera hadir** in `text-text-dim`; no switch (avoids fake control).
3. **Tentang** — chevron row → About.
4. Footer version centered `text-[11px] text-text-dim`.

### Copy language

Project CLAUDE.md says English for UI copy; existing Profile/About screens use **Bahasa Indonesia**. **Match surrounding Profile stack language (Bahasa ID)** so this tab stays consistent. Do not retranslate the whole app in this change.

## Components / files

| File | Change |
|------|--------|
| `src/types/index.ts` | `ProfileStackParamList` + `AppSettings` |
| `src/navigation/MainTabs.tsx` | Register `AppSettings` in Profile stack |
| `src/screens/profile/ProfileScreen.tsx` | Hub only: gear header; remove theme + About + version |
| `src/screens/profile/AppSettingsScreen.tsx` | **New** — theme, notifications stub, About, version |
| `src/screens/profile/AboutScreen.tsx` | Unchanged unless shared header helper is extracted |
| `src/components/ui/ThemeModePicker.tsx` | Unchanged (moved by parent only) |

Optional: local `SettingsRow` / `SectionHeader` in profile screens — do not invent a shared package unless duplication is large.

## Data / state

- Profile data: existing `useProfile` / `authStore` — no schema change.
- Theme: existing `themeStore` + `ThemeModePicker`.
- Notifications: no store; static stub.

## Error handling

- Logout: existing `signOut()` — no new error UI.
- About deep links: unchanged.
- Notifications stub: no async; no error path.

## Accessibility

- Gear and pressable rows: `accessibilityRole="button"`; gear label “Pengaturan aplikasi”.
- Notifications stub: not advertised as working control.
- Touch targets ≥ 44pt (`min-h-11`).

## Testing / acceptance

1. Tab bar still four tabs; Profile opens hub.
2. Hub: account + device + logout; **no** theme on hub.
3. Gear → AppSettings; back → hub.
4. Theme in AppSettings applies app-wide as today.
5. Notifications row visible, clearly “Segera hadir”.
6. About from AppSettings works.
7. `npm run typecheck` clean.

## Risks

- Theme discoverability depends on gear (standard pattern).
- Active-looking toggle on stub would feel broken — use static row.

## Implementation order

1. Types + stack route  
2. `AppSettingsScreen` (DESIGN.md sections)  
3. Slim `ProfileScreen` + gear (Sonic Pulse hub)  
4. Typecheck  

JS-only; no native rebuild.

## Wireframe (text)

```
PROFILE HOME                         APP SETTINGS
┌─────────────────────────┐          ┌─────────────────────────┐
│ Profil              ⚙️  │          │ ←  Pengaturan           │
│ ┌─────────────────────┐ │          │ TAMPILAN                │
│ │  (GF)  Name         │ │          │ ┌ Sistem|Terang|Gelap ┐ │
│ │  email · 📍 city    │ │          │ └─────────────────────┘ │
│ └─────────────────────┘ │          │ NOTIFIKASI              │
│ AKUN                    │          │ 🔔 Notifikasi           │
│  person / mail / WA     │          │    Segera hadir         │
│ PERANGKAT & LOKASI      │          │ TENTANG                 │
│  city / OS / model      │          │ ℹ  Tentang Gaul FM   ›  │
│ ┌ Keluar (live red)   │ │          │ v0.1.0 (MVP)            │
│ └─────────────────────┘ │          └─────────────────────────┘
└─────────────────────────┘
```
