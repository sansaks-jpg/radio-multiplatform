# Product Requirements Document (PRD)

| Field | Value |
|---|---|
| **Project name** | Gaul FM Semarang Mobile Ecosystem |
| **Target audience** | Listeners aged 15–35 (young, dynamic, mobile-first) |
| **Document level** | Integrated technical & functional MVP (Minimum Viable Product) specification |
| **Project status** | Architecture design & user-tracking phase |
| **Document language** | English |

---

## Table of contents

1. [Introduction & product vision](#1-introduction--product-vision)
2. [System architecture & technology choices](#2-system-architecture--technology-choices)
3. [Functional requirements — mobile app (user client)](#3-functional-requirements--mobile-app-user-client)
4. [Functional requirements — web admin panel](#4-functional-requirements--web-admin-panel)
5. [Database specification (schema)](#5-database-specification-schema)
6. [Data synchronization & marketing integration](#6-data-synchronization--marketing-integration)
7. [Non-functional requirements](#7-non-functional-requirements)
8. [Product roadmap](#8-product-roadmap)

---

## 1. Introduction & product vision

### 1.1 Background

Radio Gaul FM Semarang needs a digital transformation to reach young audiences more intimately through their devices. Today, listener interaction is still limited to third-party social media and visual playback via YouTube on the official website.

The official Gaul FM mobile app is designed as a centralized **one-stop digital audio platform** that delivers high-quality, low-latency, mobile-data-efficient live audio, while also serving as the hub for daily program information, local Semarang news, and high-value listener data collection for the marketing division.

### 1.2 Product vision

Create a high-performance digital ecosystem (**Mobile App & Web Admin**) that enables listeners to enjoy radio without interruption when the screen is locked (background playback), receive information in real time, streamline marketing through automatic user tracking integrated with Google Spreadsheet, and synchronize news content automatically without double data entry.

### 1.3 Scope matrix

To ensure a successful initial launch within the academic deadline, development is split into strict phases:

| Feature / module | MVP status | Description & purpose |
|---|---|---|
| Persistent Audio Player | **Required (In-Scope)** | Live stream audio playback, background service, lock-screen integration. |
| Weekly Broadcast Schedule | **Required (In-Scope)** | Daily program information, host details, active show highlight. |
| News & Event Feed | **Required (In-Scope)** | Automatic sync from Gaul FM WordPress via REST API. |
| Authentication System | **Required (In-Scope)** | Listener account registration via email using Supabase Auth. |
| User Tracking & Device Info | **Required (In-Scope)** | Automatic capture of GPS location, phone model, OS, and active login status. |
| Marketing Integration | **Required (In-Scope)** | Automatic user-data sync to Google Sheets & Excel export (`.xlsx`). |
| Web Admin Panel | **Required (In-Scope)** | Dashboard for schedule management, “Now Playing” control, and user monitoring. |
| Interactive Live Chat & Moderation | **Required (In-Scope)** | Real-time live comments synchronized between mobile listeners and broadcaster studio panel, hard-capped at 50 comments, uniform left-aligned layout, on-air pinning and moderation. |
| Low-Latency Visual Radio (WebRTC WHEP) | **Required (In-Scope)** | Real-time studio camera broadcast (<0.3s latency) from vMix via MediaMTX, HLS fallback, edge-to-edge 16:9 layout, auto-landscape rotation on fullscreen, clean minimal UI with browser controls suppressed. |
| Cloud Streaming Orchestrator | **Required (In-Scope)** | Centralized ingest hub in Web Admin (`/streams`) for vMix RTMP, RadioBOSS Icecast, and YouTube Live restreaming hosted on Azure VM (`40.81.231.250`). |
| Song Request System | **Phase 2 (Out-of-Scope)** | Interactive form to submit song requests directly to the broadcast system. |
| Gameshow & GPS Checkpoint | **Later phase (Out-of-Scope)** | Timed quizzes, GPS coordinate tracking for scavenger hunts. |

---

## 2. System architecture & technology choices

The Gaul FM ecosystem adopts a flexible **three-tier architecture** that is friendly to rapid AI-assisted / vibe-coding development.

```
┌────────────────────────────────────────────────────────┐
│                  MOBILE CLIENT APP                     │
│      React Native Expo (TypeScript) + NativeWind       │
└─────────────┬────────────────────────────▲─────────────┘
              │                            │
              │ REST / Supabase SDK        │ Push Notifications
              ▼                            │
┌──────────────────────────────────────────┴─────────────┐
│                  BACKEND PLATFORM                      │
│      Supabase (PostgreSQL, Edge Functions, Auth)       │
└─────────────▲────────────────────────────▲─────────────┘
              │                            │
              │ Cron Sync                  │ REST API & Webhook Sync
              │                            │
┌─────────────┴──────────┐      ┌──────────┴─────────────┐
│    EXISTING WEBPAGE    │      │    WEB ADMIN PANEL     │
│ WordPress / REST API   │      │   Next.js (App Router) │
└────────────────────────┘      └──────────┬─────────────┘
                                           │
                                           ▼
                                ┌────────────────────┐
                                │  GOOGLE SHEETS &   │
                                │   MARKETING DATA   │
                                └────────────────────┘
```

### 2.1 Front-end mobile (listener app)

| Concern | Choice | Rationale |
|---|---|---|
| Framework | React Native (Expo SDK) on TypeScript | Minimizes native Android/iOS configuration complexity and speeds up compilation (Fast Refresh). |
| Visual styling engine | Tailwind CSS (via NativeWind v4) | Aligns CSS class-based visual declarations between the mobile app and the web admin dashboard. |
| Global state management | Zustand | Lightweight, low boilerplate; ideal for audio player state across navigation. |
| Data caching | TanStack Query (React Query) v5 | Handles data fetching, local in-memory cache, and automatic background refetching. |

### 2.2 Audio architecture & background playback

| Concern | Specification |
|---|---|
| Player library | `react-native-track-player` — industry standard for background audio. Connects the app directly to OS APIs (Android MediaSession / iOS RemoteCommandCenter). |
| Stream format | Icecast/HLS-based audio stream using AAC or MP3 compression to save mobile bandwidth, targeting **96 kbps to 128 kbps** for an optimal quality-to-data-size ratio. |

### 2.3 Backend & data storage

| Concern | Choice |
|---|---|
| Backend-as-a-Service (BaaS) | Supabase |
| Database management system | PostgreSQL running on the Supabase cloud compute cluster |
| Security & authentication | Supabase Auth for listener registration (email & password) and admin access control |
| Media storage | Supabase Storage for program cover images and static app assets |

### 2.4 News synchronization path (WordPress sync pipeline)

| Concern | Specification |
|---|---|
| Data source | Internal REST API of the Gaul FM Semarang WordPress site at `/wp-json/wp/v2/posts` |
| Sync mechanism | Supabase Edge Functions executed periodically via Supabase’s built-in scheduler (Cron Job) |
| System benefits | Prevents Gaul FM admins from entering news twice (publish once on WordPress; the mobile app updates automatically) and applies reverse-proxy caching on the Supabase database to protect the main site from traffic spikes |

---

## 3. Functional requirements — mobile app (user client)

The mobile app uses a basic Bottom Tab Bar with **4 main screens** and a **Persistent Mini Player** above the navigation bar when audio is playing.

```
[Root Navigation]
├── Launch Screen / Splash
├── Auth Stack (Login / Register / Forgot Password)
└── Main Tab Navigator
    ├── Home Screen
    │   └── Mini Player View (persistent across tabs)
    ├── Schedule Screen
    ├── News Feed Screen
    │   └── News Detail (Modal / Stack Screen)
    └── Profile Screen (Settings & Tracking Info)
```

### 3.1 Mobile screen feature details

#### A. Home Screen — Live Player

The primary entry point, fully focused on the live radio listening experience.

**Identity & live status**

- Displays the dynamic Gaul FM Semarang logo and a soft blinking red **“LIVE”** visual indicator when the broadcast server is detected as actively streaming audio.

**Now Playing Card (active broadcast info)**

| Element | Behavior |
|---|---|
| Cover artwork | Shows the on-air program poster (from the `now_playing` table, updated dynamically by Web Admin). |
| Program title | Bold, large, representative text. |
| Host name(s) | List of active hosts presenting the program session. |

**Audio control system (Player Controls)**

- A single large Play / Pause / Buffering button (with a circular loading indicator during initial stream buffer load).

**Mini Player persistence system**

- When the user leaves Home for another screen, the audio player collapses into a thin horizontal bar (**Mini Player**) attached just above the Bottom Tab Bar.
- Mini Player contains: small cover image (**48 × 48 px**), scrolling program title, and quick Play/Pause button.

#### B. Schedule Screen

Displays the full daily broadcast schedule for the current week.

**Day selector**

- Horizontal scrollable tab bar for Monday through Sunday.
- By default, the active day when the app opens is highlighted based on the listener device’s current day.

**Program list card**

- Shows schedule cards in chronological order from morning to night.
- Each card shows: broadcast time range, program name, host photo, and a short topic description.

**On-air indicator**

- If a program card is currently on air for the active day and time, the card gets a special visual accent (e.g. orange glow frame) and the label **“On Air”**.

#### C. News & Event Screen (News Feed)

Serves up-to-date information about Semarang city, local musician releases, and internal Gaul FM event agendas.

**News feed (feed grid)**

- Latest news list using either a two-column infinite-scroll grid or a clean large single-column vertical list.
- Each news card includes: main image (**16:9** aspect ratio), category, title, publication date, and a Quick Share button.

**News detail (detail view stack)**

- On tap, opens a full stack screen with full-size header image, release date, full article body with comfortable paragraph formatting, and a back button.

**Offline reader cache**

- TanStack Query combined with local storage (AsyncStorage/MMKV) stores the last downloaded news data.
- If the user loses internet connectivity, previously loaded news remains readable without showing an empty error screen.

#### D. Profile & Settings Screen

Personalization screen where users manage how the app interacts with their device.

**User identity**

- Displays profile photo, full name, email, and WhatsApp number of the signed-in listener.

**Transparent tracking status**

- Shows current city detection (based on GPS) and device details (OS, phone model) as transparency for data collected by the system.

**Help center & policy**

- Links for “About Gaul FM” (studio address, phone number, commercial email) and a Logout button.

#### E. Visual Radio & Live Stream Sheet (`LiveDetailSheet`)

Full-screen live broadcast modal providing visual radio streaming, live listener comments, and program details.

| Item | Specification |
|---|---|
| Streaming protocol | MediaMTX WebRTC (WHEP) for ultra-low latency (<0.3s) with automated HLS fallback (`hls.js`). |
| Audio orchestration | Automatic mutual exclusion: activating Visual Radio calls `stopLive()` to prevent dual audio; closing Visual Radio resumes Icecast audio if active. |
| Edge-to-edge layout | 16:9 full-width video container (`w-full aspect-[16/9]`) sitting flush above live chat without side-margins or vertical clipping. |
| Auto-landscape rotation | Fullscreen button or double-tap automatically triggers `ScreenOrientation.lockAsync(LANDSCAPE)`; exiting restores `PORTRAIT_UP`. |
| Clean broadcast UI | Fullscreen requested on container element with CSS suppression for all vendor media controls (`::-webkit-media-controls*`). No native scrubber timeline, pause button, or duration text; single floating fullscreen button auto-hides after 2.5s. |

### 3.2 Native phone notification integration

The app must actively interact with the listener device OS through three types of native notifications:

#### 1. Persistent media notification (music player notification)

- Persistent notification (not dismissible by swipe) in the Notification Drawer and on the Lockscreen.
- Shows quick Play/Pause controls, song/program name, and broadcast cover art.
- Uses a Foreground Service on Android so the OS does not kill audio playback when the phone is locked.

#### 2. Location access notification (GPS / location permission)

- Triggers the OS foreground location permission dialog at registration or first app open.
- Uses the `expo-location` library to capture latitude and longitude **once** at login to detect the listener’s region of origin.

#### 3. Standard push notification alerts

- Heads-up / banner notifications at the top of the screen when an admin sends a message from Web Admin.
- Uses `expo-notifications` connected to the Expo Push Notification Service.
- Each listener device has a unique **Push Token** stored in the Supabase database.

---

## 4. Functional requirements — web admin panel

Internal management dashboard designed as a **desktop-oriented responsive web page** for Gaul FM Semarang producers or broadcasters.

```
[Sidebar Navigation]
├── Dashboard Overview & Analytics
├── Active Broadcast Control (Now Playing Switcher)
├── Streaming Orchestrator (vMix & RadioBOSS Ingest)
├── Live Chat Moderation Dashboard
├── Broadcast Schedule Management (Schedule Editor)
├── News Center (News & Sync Center)
├── Promotional Banners Manager
└── User & Marketing Management (User & Marketing Data)
```

### 4.1 Admin feature specifications

#### A. Active broadcast control (Now Playing Switcher)

| Item | Specification |
|---|---|
| Primary function | Instantly update broadcast information (real-time update) to all listener apps. |
| Input form | Program dropdown from the `programs` table, host name field, and manual cover image upload to Supabase Storage. |
| Confirm action | **“Update Now Playing”** button that updates the `now_playing` table in Supabase and triggers an instant state update on listener phones. |

#### B. Broadcast schedule management (Schedule Editor)

| Item | Specification |
|---|---|
| Data operations (CRUD) | Full ability to add, edit details, and delete weekly program schedules. |
| Input validation | System must validate overlapping schedules on the same day to avoid conflicting information. |

#### C. News center (News Manager)

| Item | Specification |
|---|---|
| News sync monitor | Displays history of news successfully pulled from the main WordPress site. |
| Manual **“Sync Now”** trigger | Manual button if an admin wants to force-pull the latest WordPress news immediately without waiting for the next automatic cron job. |

#### D. User & marketing management (User & Marketing Dashboard)

Primary page for the marketing division to monitor listener demographics.

| Item | Specification |
|---|---|
| User data table | Full name, email, WhatsApp number, device OS, phone type, location coordinates, and detected city for all registered listeners. |
| Excel export | A dedicated **“Export Listener Data (.xlsx)”** button that renders and downloads a raw spreadsheet using the `xlsx` (SheetJS) library directly in the admin browser. |
| Google Sheets sync status | Shows the status indicator for automatic real-time sync to the marketing division’s main Google Spreadsheet. |

#### E. Live chat moderation & studio broadcast (Live Chat Room)

| Item | Specification |
|---|---|
| Real-time stream | Server-Sent Events (SSE) `/api/comments/stream` and REST polling for instantaneous comment feeds. |
| Moderation actions | Broadcaster can toggle **"On Air"** highlight status (`is_highlighted`) or hide inappropriate messages (`is_hidden`). |
| Studio broadcast | Broadcaster composer allowing studio team to send comments marked as official **Studio** (`is_broadcaster: true`). |
| Bandwidth & memory cap | In-memory and API buffer hard-capped to 50 items (`MAX_HISTORY_COMMENTS = 50`) for serverless safety. |

#### F. Streaming Orchestrator (`/streams`)

| Item | Specification |
|---|---|
| Primary function | Independent ingest control center for Audio (RadioBOSS) and Visual (vMix) studio hardware, as well as Cloud Restreaming. |
| Ingest endpoints | Tabbed setup interface for vMix (RTMP `rtmp://40.81.231.250:1935/gaulfm`), RadioBOSS (Icecast Port 8000, Mount `/gaulfm`), and YouTube Live Direct Copy Engine. |
| Security & utilities | One-click copy buttons with fallback for non-secure HTTP contexts (`document.execCommand('copy')`). |
| Cloud engine status | Real-time status indicators for MediaMTX (1935, 8888, 8889), Icecast (8000), and Next.js Web Admin (3001) hosted on Azure VM (`40.81.231.250`). |

---

## 5. Database specification (schema)

PostgreSQL table design on Supabase to meet all MVP functional needs and the user-tracking system.

### 5.1 Entity relationship overview (ERD)

```
                       ┌─────────────────┐
                       │   now_playing   │
                       ├─���───────────────┤
                       │ id (PK)         │
                       │ current_program │
                       │ current_host    │
                       │ current_cover   │
                       │ updated_at      │
                       └─────────────────┘


┌──────────────────┐                       ┌──────────────────┐
│     programs     │                       │       news       │
├──────────────────┤                       ├──────────────────┤
│ id (PK)          │                       │ id (PK)          │
│ name             │                       │ wp_post_id (UQ)  │
│ host             │                       │ title            │
│ day_of_week      │                       │ content          │
│ start_time       │                       │ image_url        │
│ end_time         │                       │ published_at     │
│ cover_url        │                       │ synced_at        │
│ created_at       │                       └──────────────────┘
└──────────────────┘


                       ┌──────────────────┐
                       │     profiles     │
                       ├──────────────────┤
                       │ id (PK, FK)      │
                       │ email            │
                       │ full_name        │
                       │ whatsapp_number  │
                       │ device_os        │
                       │ device_model     │
                       │ location_city    │
                       │ location_lat     │
                       │ location_lng     │
                       │ last_login       │
                       │ created_at       │
                       └──────────────────┘


                       ┌──────────────────┐
                       │  live_comments   │
                       ├──────────────────┤
                       │ id (PK)          │
                       │ user_name        │
                       │ avatar_seed      │
                       │ message          │
                       │ is_highlighted   │
                       │ is_hidden        │
                       │ is_broadcaster   │
                       │ created_at       │
                       └──────────────────┘
```

### 5.2 SQL DDL script (Supabase-compatible)

The complete SQL script below must be run in the Supabase SQL Editor to create the correct table structure, indexes, and relations.

```sql
-- 1. Now Playing table (stores only a single live-status row)
CREATE TABLE now_playing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    current_program VARCHAR(255) NOT NULL,
    current_host VARCHAR(255) NOT NULL,
    current_cover_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial data
INSERT INTO now_playing (current_program, current_host, current_cover_url)
VALUES ('Morning Gaul', 'Sandi & Partner', 'https://placeholder.co/300');

-- 2. Weekly broadcast schedule master table
CREATE TABLE programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    host VARCHAR(255) NOT NULL,
    day_of_week VARCHAR(15) NOT NULL, -- 'Monday', 'Tuesday', etc.
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    cover_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. News table (synced from WordPress)
CREATE TABLE news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wp_post_id INTEGER UNIQUE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    published_at TIMESTAMP WITH TIME ZONE NOT NULL,
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. User profiles table (auto-linked with Supabase Auth)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    whatsapp_number VARCHAR(20),

    -- Device & location tracking columns
    device_os VARCHAR(50),          -- 'Android' or 'iOS'
    device_model TEXT,              -- e.g. 'Xiaomi Redmi Note 10'
    location_city VARCHAR(100),     -- Detected city, e.g. 'Semarang'
    location_lat DECIMAL(9,6),      -- Last latitude coordinate
    location_lng DECIMAL(9,6),      -- Last longitude coordinate

    -- Activity status
    last_login TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes to speed up marketing data lookups
CREATE INDEX idx_profiles_location_city ON profiles(location_city);
CREATE INDEX idx_profiles_email ON profiles(email);

-- 5. Live comments table (serverless synced live chat, capped at 50)
CREATE TABLE live_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_name VARCHAR(100) NOT NULL,
    avatar_seed VARCHAR(100) DEFAULT 'listener',
    message VARCHAR(500) NOT NULL,
    is_highlighted BOOLEAN DEFAULT FALSE,
    is_hidden BOOLEAN DEFAULT FALSE,
    is_broadcaster BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index to speed up live chat polling and ordering
CREATE INDEX idx_live_comments_active ON live_comments(is_hidden, created_at DESC);
```

---

## 6. Data synchronization & marketing integration

### 6.1 User tracking & registration pipeline

Every time a user registers in the mobile app, the app collects several data points transparently in the background:

| Step | Behavior |
|---|---|
| Device detection | Uses the React Native `Platform` module to detect OS (Android / iOS) and the `expo-device` library to detect brand and device model. |
| Location detection | `expo-location` captures GPS coordinates (`latitude`, `longitude`) once, instantly. Coordinates are sent to the Supabase server, then converted to a city name (reverse-geocoding) to simplify marketing territory categorization. |
| Supabase Auth integration | The account is registered in Supabase Auth. On success, a database trigger copies the account data and device metadata into the `profiles` table. |

### 6.2 Automatic Google Spreadsheet sync (real-time marketing pipeline)

The marketing division needs always-up-to-date data without depending on developer access to the internal database.

```
┌─────────────────────┐      Trigger Row      ┌─────────────────────────┐
│  profiles table     ├──────────────────────>│  Supabase DB Webhook    │
│  (Supabase Postgres)│                       └───────────┬─────────────┘
└─────────────────────┘                                   │
                                                          ▼ POST payload
┌─────────────────────┐      Append Row       ┌─────────────────────────┐
│  Google Spreadsheet │<──────────────────────│ Next.js API Route       │
│ (Marketing Access)  │                       │ (/api/sync-sheets)      │
└─────────────────────┘                       └─────────────────────────┘
```

| Stage | Behavior |
|---|---|
| Database trigger (Supabase Webhook) | Every new row (`INSERT`) into `profiles` automatically fires a Supabase Database Webhook. |
| API handler (Next.js) | The webhook sends a JSON payload of the new user to the Next.js API route `/api/sync-sheets` using a secure token authorization system (Security Header). |
| Google Sheets API interaction | The Next.js API Route processes the data, calls the official `@googleapis/sheets` module with a free Google Cloud Service Account credential, and **appends a row** to the bottom of the target spreadsheet in real time. |

---

## 7. Non-functional requirements

Qualitative system aspects that must be met to ensure user satisfaction and application stability when presented to examiners.

### 7.1 Audio playback performance & latency

| Requirement | Target |
|---|---|
| Time to first frame (initial playback latency) | Buffering latency after Play is first pressed must not exceed **3.0 seconds** under normal mobile network conditions of at least HSPA+ / 4G LTE. |
| Background state stability | The app must not be unilaterally killed by the Android or iOS garbage collector while playing audio in the background for at least **60 minutes** of continuous uninterrupted playback. |

### 7.2 Power & network efficiency

| Requirement | Target |
|---|---|
| Audio bandwidth efficiency | Audio compression must use a high-efficiency codec (e.g. AAC-HEv2) friendly to mobile data quotas, with maximum bandwidth consumption not exceeding about **60 MB per hour** of active listening. |
| Device battery consumption | Phone temperature must not rise sharply (overheating) during screen-off audio playback, with maximum battery drain of **5% to 8% per hour** of active use. |

### 7.3 System availability & offline access

| Requirement | Target |
|---|---|
| Connection-loss tolerance | The app must show a user-friendly offline fallback page when the internet is fully down, instead of force-closing or showing a plain white screen. |
| News cache access | At least **15** most recently opened news items must remain fully readable without an active internet signal, via TanStack Query local offline storage. |

### 7.4 Network security

| Requirement | Target |
|---|---|
| Encrypted data communication | All data exchange between the mobile app, Supabase backend, and web admin panel must run over secure **HTTPS** with SSL/TLS encryption certification of at least version **1.3**. |

---

## 8. Product roadmap

To keep focus and energy on successfully completing this final project (TA), development is divided into **3 measurable product evolution phases**:

```
                  ┌───────────────────────────────────────────────┐
                  │                    PHASE 1                    │
                  │              MVP (BASE RELEASE)               │
                  │   Core Audio, Schedule, Auto-News WP Sync,   │
                  │      User Tracking & Marketing Sheet Sync     │
                  └──────────────────────┬────────────────────────┘
                                         │
                                         ▼
                  ┌───────────────────────────────────────────────┐
                  │                    PHASE 2                    │
                  │             SOCIAL INTEGRATION                │
                  │   Live Interactive Chat & Song Request        │
                  └──────────────────────┬────────────────────────┘
                                         │
                                         ▼
                  ┌───────────────────────────────────────────────┐
                  │                    PHASE 3                    │
                  │            CHALLENGES & EVENTS                │
                  │     Quiz, GPS Checkpoint, Leaderboard         │
                  └───────────────────────────────────────────────┘
```

### Phase 1: Minimum Viable Product (MVP) & data foundation — **COMPLETED**

**Goal:** Build a solid digital radio platform foundation free of background-player crash issues, plus a user data system for commercial / marketing needs.

| Deliverable | Scope |
|---|---|
| Mobile app | Live audio player, automatic WordPress news sync, daily schedule rendering, email registration (Supabase Auth), and device hardware + GPS coordinate tracking. |
| Web Admin | Now Playing control panel, program schedule CRUD, user data monitoring dashboard, Excel export button, and automated Google Spreadsheet sync. |

### Release Version History & Incremental Delivery

| Version | Status | Key Features & Highlights |
|---|---|---|
| **v0.0.1** | Released | Initial MVP foundation: Icecast progressive streaming, background audio playback with lock screen controls, MediaMTX WebRTC (WHEP) visual radio, and automated Android CI/CD. |
| **v0.0.2** | Released | Unified 16:9 banner layout across Admin & Mobile, persistent program artwork, Supabase storage bucket sync, 7 Gaul Squad announcers, and multi-layer real-time live chat. |
| **v0.0.3** | Released | Google Sign-in authentication flow, automatic returning user biodata bypass, JIT system permissions (notifications & location), and adaptive dark mode studio theme. |
| **v0.0.4** | Released | Official master program info (`OFFICIAL_PROGRAM_INFO`) for 3 daily shows, announcer profile carousel in `LiveDetailSheet`, Home Up Next redesign with WIB badge, studio quick action, and Android ABI Split (separate 32-bit `armeabi-v7a`, 64-bit `arm64-v8a`, and `universal` APKs reducing download sizes by ~70%). |

### Phase 2: Interactive social features (mid-term development)

**Goal:** Increase engagement of active Gaul FM listeners.

**Additional features:**

| Feature | Description |
|---|---|
| Live Shoutbox (Chat Room) | Real-time chat under the player that automatically purges messages older than 24 hours to save database space. |
| Song Request System | Form module to submit song titles directly to the admin web monitor screen in the broadcast studio. |

### Phase 3: Event activity & gamification module (advanced development)

**Goal:** Integrate traditional on-air broadcast activities with off-air physical listener activities through a device-based gamification approach.

**Additional features:**

| Feature | Description |
|---|---|
| In-App Gameshow & Quiz | Timed interactive quiz module activated manually by the host during quiz programs. |
| GPS Checkpoint (Scavenger Hunt) | Map system integration that directs listeners to specific physical posts in Semarang, with instant in-app camera capture verification for clues and real-time merchandise prizes. |

---

*End of Product Requirements Document — Gaul FM Semarang Mobile Ecosystem (MVP).*
