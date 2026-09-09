import React, { useCallback, useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { usePlayerStore } from "../../stores/playerStore";
import { useAuthStore } from "../../stores/authStore";
import { usePrograms } from "../../hooks/usePrograms";
import { flattenNewsPages, useNews } from "../../hooks/useNews";
import { useBanners } from "../../hooks/useBanners";
import { isOnAirNow, todayDow, getWibParts } from "../../utils/datetime";
import { openExternalUrl, openYouTube } from "../../services/youtube";
import { Screen } from "../../components/ui/Screen";
import { TopNavbar } from "../../components/ui/TopNavbar";
import { OfflineBanner } from "../../components/ui/OfflineBanner";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { LiveDetailSheet } from "../../components/player/LiveDetailSheet";
import { HomeHeroBanner } from "../../components/home/HomeHeroBanner";
import { HomeNewsPreview } from "../../components/home/HomeNewsPreview";
import { HomeHero } from "../../components/home/HomeHero";
import { HomeUpNext } from "../../components/home/HomeUpNext";
import { HomeQuickActions } from "../../components/home/HomeQuickActions";
import {
  VisualLiveCard,
  type VisualLiveCardHandle,
} from "../../components/home/VisualLiveCard";
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
 * Home dashboard — Redesigned for Focus:
 * 1. Top Navbar (Branding & Profile)
 * 2. Greeting & Live Player (Hero) - Most important!
 * 3. Quick Actions - Circular modern buttons
 * 4. Promo Banners - Edge-to-edge carousel
 * 5. Visual Radio & News
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
  const visualCardRef = useRef<VisualLiveCardHandle>(null);

  const openVisualRadio = useCallback(() => {
    const opened = visualCardRef.current?.openPlayer();
    if (!opened) void openYouTube("channel");
  }, []);

  const name = displayName(profile?.full_name);

  const navigation = useNavigation();

  const isRefreshing =
    todayPrograms.isRefetching || news.isRefetching || banners.isRefetching;
  const onRefresh = useCallback(() => {
    void todayPrograms.refetch();
    void news.refetch();
    void banners.refetch();
  }, [todayPrograms, news, banners]);

  const onBannerPress = useCallback(
    (banner: Banner) => {
      if (banner.link_to) {
        const tabMap: Record<string, string> = {
          schedule: "Schedule",
          news: "News",
          profile: "Profile",
        };
        const targetTab = tabMap[banner.link_to];
        if (targetTab) {
          navigation.navigate(targetTab as never);
          return;
        }
      }
      if (banner.link_url) {
        void openExternalUrl(banner.link_url);
      }
    },
    [navigation],
  );

  return (
    <Screen
      scroll
      dockInset="tabs"
      padded={false}
      refreshing={isRefreshing}
      onRefresh={onRefresh}
    >
      <View className="px-4 pt-1 pb-1">
        <TopNavbar />
      </View>

      <View className="px-4">
        {/* Greeting */}
        <View className="mb-5 mt-2">
          <Text
            className="text-[14px] font-medium text-text-dim"
            style={{ fontFamily: "PlusJakartaSans_500Medium" }}
          >
            {name ? `${greeting()},` : greeting()}
          </Text>
          {name ? (
            <Text
              className="mt-0.5 text-[24px] font-extrabold tracking-tight text-text"
              numberOfLines={2}
              style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
            >
              {name}
            </Text>
          ) : null}
        </View>

        <OfflineBanner />

        {/* Live hero — Main audio on-air card */}
        <View className="mb-6">
          <HomeHero
            matchedProgram={onAirProgram}
            onOpenDetail={() => setLiveSheetOpen(true)}
            now={now}
          />
          {nextProgram ? (
            <View className="mt-3">
              <HomeUpNext program={nextProgram} />
            </View>
          ) : null}
        </View>

        {/* Quick actions */}
        <View className="mb-7">
          <HomeQuickActions
            actions={[
              {
                key: "schedule",
                label: "Jadwal",
                icon: "calendar-outline",
                colorKey: "brand",
                onPress: () => navigation.navigate("Schedule" as never),
              },
              {
                key: "chat",
                label: "Live Chat",
                icon: "chatbubbles-outline",
                colorKey: "orange",
                onPress: () => setLiveSheetOpen(true),
              },
              {
                key: "visual",
                label: "Visual Radio",
                icon: "videocam-outline",
                colorKey: "live",
                onPress: openVisualRadio,
              },
              {
                key: "news",
                label: "Berita",
                icon: "newspaper-outline",
                colorKey: "brand",
                onPress: () => navigation.navigate("News" as never),
              },
            ]}
          />
        </View>
      </View>

      {/* Promos */}
      <View className="mb-8">
        <HomeHeroBanner
          banners={banners.data ?? []}
          onPress={onBannerPress}
          autoPlayIntervalMs={4000}
        />
      </View>

      <View className="px-4">
        {/* Visual radio */}
        <View className="mb-8">
          <SectionHeader title="Visual Radio Studio" />
          <View className="mt-4">
            <VisualLiveCard ref={visualCardRef} />
          </View>
        </View>

        {/* Berita Terkini */}
        <HomeNewsPreview items={newsItems} />

        <View className="h-8" />
      </View>

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
