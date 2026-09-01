import React, { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import { usePlayerStore } from "../../stores/playerStore";
import { useAuthStore } from "../../stores/authStore";
import { usePrograms } from "../../hooks/usePrograms";
import { flattenNewsPages, useNews } from "../../hooks/useNews";
import { useBanners } from "../../hooks/useBanners";
import { isOnAirNow, todayDow, getWibParts } from "../../utils/datetime";
import { openExternalUrl } from "../../services/youtube";
import { Screen } from "../../components/ui/Screen";
import { TopNavbar } from "../../components/ui/TopNavbar";
import { OfflineBanner } from "../../components/ui/OfflineBanner";
import { LiveDetailSheet } from "../../components/player/LiveDetailSheet";
import { PromoBanner } from "../../components/home/PromoBanner";
import { HomeNewsPreview } from "../../components/home/HomeNewsPreview";
import { HomeHero } from "../../components/home/HomeHero";
import { HomeUpNext } from "../../components/home/HomeUpNext";
import { VisualLiveCard } from "../../components/home/VisualLiveCard";
import type { Banner } from "../../types";

/** Time-of-day greeting (WIB device clock). */
function greeting(): string {
  const parts = getWibParts();
  const h = parts.hours;
  if (h >= 4 && h < 11) return "Selamat pagi";
  if (h >= 11 && h < 15) return "Selamat siang";
  if (h >= 15 && h < 19) return "Selamat sore";
  return "Selamat malam";
}

/** Full display name from profile (not truncated to first token). */
function displayName(fullName: string | null | undefined): string | null {
  if (!fullName) return null;
  const t = fullName.trim();
  return t.length > 0 ? t : null;
}

/**
 * Home dashboard (Sonic Pulse):
 * top navbar → greeting → audio hero → up-next → promo → visual YT → berita.
 */
export function HomeScreen() {
  const nowPlaying = usePlayerStore((s) => s.nowPlaying);
  const profile = useAuthStore((s) => s.profile);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const todayPrograms = usePrograms(todayDow(now));
  const news = useNews();
  const banners = useBanners();

  const programs = todayPrograms.data ?? [];
  const onAirProgram = programs.find((p) => isOnAirNow(p, now)) ?? null;
  const onAirIndex = onAirProgram ? programs.indexOf(onAirProgram) : -1;
  const nextProgram =
    onAirIndex >= 0
      ? (programs[onAirIndex + 1] ?? null)
      : (programs.find(
          (p) =>
            p.day_of_week === todayDow(now) &&
            p.start_time >
              `${String(getWibParts(now).hours).padStart(2, "0")}:${String(
                getWibParts(now).minutes,
              ).padStart(2, "0")}`,
        ) ?? null);

  const newsItems = flattenNewsPages(news.data?.pages).slice(0, 5);
  const [liveSheetOpen, setLiveSheetOpen] = useState(false);

  const name = displayName(profile?.full_name);

  // Banners only deep-link to unique destinations (external / specific content).
  // Tab destinations (Jadwal / Berita / Profil) already live in the bottom bar —
  // never re-route there from Home chips or carousels.
  const onBannerPress = useCallback((banner: Banner) => {
    if (banner.link_url) {
      // YouTube → native app; other URLs → system handler
      void openExternalUrl(banner.link_url);
    }
  }, []);

  return (
    <Screen scroll dockInset="tabs">
      <TopNavbar className="mt-1" />

      <View className="mt-4">
        {/* Greeting: "Selamat pagi, Reno — nama besar di bawahnya" */}
        <Text
          className="text-[13px] font-semibold text-text-dim"
          style={{ fontFamily: "PlusJakartaSans_600SemiBold" }}
        >
          {name ? `${greeting()},` : greeting()}
        </Text>
        {name ? (
          <Text
            className="mt-0.5 text-[22px] font-extrabold tracking-tight text-text"
            numberOfLines={2}
            style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
          >
            {name}
          </Text>
        ) : null}
      </View>

      <OfflineBanner />

      {/* Live hero — THE main action, immersive now-playing card */}
      <View className="mt-5">
        <HomeHero
          matchedProgram={onAirProgram}
          onOpenDetail={() => setLiveSheetOpen(true)}
        />
        {nextProgram ? <HomeUpNext program={nextProgram} /> : null}
      </View>

      {/* Sorotan — rekomendasi (external / content only, never tab duplicates) */}
      <View className="mt-8">
        <PromoBanner banners={banners.data ?? []} onPress={onBannerPress} />
      </View>

      {/* Visual radio — auto from YouTube @radiogaulfm_smg/streams */}
      <VisualLiveCard />

      {/* Berita */}
      <HomeNewsPreview items={newsItems} />

      <View className="h-6" />

      <LiveDetailSheet
        visible={liveSheetOpen}
        onClose={() => setLiveSheetOpen(false)}
        nowPlaying={nowPlaying}
        matchedProgram={onAirProgram}
        autoPlayOnOpen
      />
    </Screen>
  );
}
