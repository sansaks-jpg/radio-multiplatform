# Profile hub + App settings + Notifications Implementation Plan

<!--
Importers: implementing agent / this session.
API: ProfileStackParamList.AppSettings; notificationPreferenceStore; notifications.ts enable/disable.
Schema: AsyncStorage @gaulfm/notifications-enabled; Profile.push_token unchanged.
User: "pakai juga context7, lalu sekalian implementasikan notifikasi." + profile split + DESIGN.md
-->

**Goal:** Split Profile from App Settings (gear); real notification preference + OS permission (expo-notifications / Context7).

**Architecture:** Stack `AppSettings`. Zustand+AsyncStorage preference. notifications.ts: Android channel, enable/disable, cancel schedules; scheduleProgramReminder respects preference.

**Tech:** Expo 54, expo-notifications, Zustand, AsyncStorage, DESIGN.md tokens.

## Tasks
1. Types + Profile stack route
2. notificationPreferenceStore + notifications service
3. AppSettingsScreen
4. Slim ProfileScreen + gear
5. Hydrate preference in ThemeRoot/App; typecheck
