import React, { useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useThemeStore } from "../stores/themeStore";
import { useOnboardingStore } from "../stores/onboardingStore";
import { BrandLogo } from "../components/ui/BrandLogo";
import { Button } from "../components/ui/Button";

// Local bundled onboarding artwork assets (offline-first & instant first-launch paint)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const slide1 = require("../../assets/onboarding/slide-1.jpg");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const slide2 = require("../../assets/onboarding/slide-2.jpg");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const slide3 = require("../../assets/onboarding/slide-3.jpg");

interface OnboardingSlide {
  key: string;
  localImage: number;
  imageUrl: string;
  title: string;
  subtitle: string;
  description: string;
}

const SLIDES: OnboardingSlide[] = [
  {
    key: "onboarding-1",
    localImage: slide1,
    imageUrl:
      "https://radiogaulfmsmg.com/wp-content/uploads/2026/02/WhatsApp-Image-2026-02-14-at-21.11.13-5.jpeg",
    title: "87.8 GAUL FM Semarang",
    subtitle: "Radio Anak Muda • The Best Visual Radio Station",
    description:
      "Radio dengan format Contemporary Hits Radio (CHR) untuk usia 15 - 29 tahun. Menghadirkan siaran FM dan visual streaming yang membuat pengalaman mendengar jadi lebih hidup dan interaktif.",
  },
  {
    key: "onboarding-2",
    localImage: slide2,
    imageUrl:
      "https://radiogaulfmsmg.com/wp-content/uploads/2026/02/WhatsApp-Image-2026-02-14-at-21.13.09-6.jpeg",
    title: "Radio Visual Pertama di Semarang",
    subtitle: "Lihat siarannya, bukan cuma dengar",
    description:
      "Gaul FM menghadirkan konsep visual radio — siaran audio yang dapat disaksikan secara real-time melalui YouTube. Pendengar tidak hanya mendengar, tetapi juga melihat suasana studio, interaksi penyiar, dan energi siaran secara langsung.",
  },
  {
    key: "onboarding-3",
    localImage: slide3,
    imageUrl:
      "https://radiogaulfmsmg.com/wp-content/uploads/2026/02/WhatsApp-Image-2026-02-14-at-21.18.24.jpeg",
    title: "Multiplatform & Always Connected",
    subtitle: "87.8 FM • YouTube • Instagram • TikTok",
    description:
      "Siaran dapat dinikmati melalui 87.8 FM dan streaming visual di YouTube. Gaul FM juga aktif di Instagram dan TikTok untuk konten interaktif, highlight siaran, serta update terbaru bagi Gaul People.",
  },
];

/**
 * First-launch onboarding carousel (plan §1 pre-auth flow).
 * Three swipeable slides + Skip / Next / Dot navigation controls.
 * Uses bundled local assets, dynamic window dimensions, hardware LinearGradient,
 * and adaptive Light / Dark theme support.
 */
export function OnboardingScreen() {
  const mode = useThemeStore((s) => s.mode);
  const colors = useThemeStore((s) => s.colors);
  const toggleLightDark = useThemeStore((s) => s.toggleLightDark);
  const complete = useOnboardingStore((s) => s.complete);
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const isDark = mode === "dark";
  const heroHeight = Math.round(screenHeight * 0.46);

  const listRef = useRef<FlatList<OnboardingSlide>>(null);
  const [index, setIndex] = useState(0);

  const isLast = index === SLIDES.length - 1;

  const scrollToSlide = (targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= SLIDES.length) return;
    setIndex(targetIndex);
    listRef.current?.scrollToOffset({
      offset: targetIndex * screenWidth,
      animated: true,
    });
  };

  const goNext = () => {
    if (isLast) {
      void complete();
      return;
    }
    scrollToSlide(index + 1);
  };

  const skip = () => {
    void complete();
  };

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const nextIdx = Math.round(offsetX / screenWidth);
    if (nextIdx >= 0 && nextIdx < SLIDES.length) {
      setIndex(nextIdx);
    }
  };

  return (
    <View className="flex-1 bg-bg">
      <StatusBar style={isDark ? "light" : "dark"} animated />

      {/* Top Header Overlay (Logo + Theme Toggle + Skip) */}
      <View
        className="absolute inset-x-0 top-0 z-20 flex-row items-center justify-between px-6"
        style={{ paddingTop: Math.max(insets.top, 16) }}
      >
        <BrandLogo size="sm" />

        <View className="flex-row items-center gap-2">
          {/* Theme Toggle Button */}
          <Pressable
            onPress={toggleLightDark}
            accessibilityRole="button"
            accessibilityLabel="Ganti mode tampilan (Terang / Gelap)"
            hitSlop={8}
            className="h-10 w-10 items-center justify-center rounded-full border border-line"
            style={{
              backgroundColor: isDark
                ? "rgba(0, 0, 0, 0.5)"
                : "rgba(255, 255, 255, 0.9)",
            }}
          >
            <Feather
              name={isDark ? "sun" : "moon"}
              size={18}
              color={colors.text}
            />
          </Pressable>

          {!isLast ? (
            <Pressable
              onPress={skip}
              accessibilityRole="button"
              accessibilityLabel="Lewati onboarding"
              hitSlop={12}
              className="min-h-10 justify-center rounded-full px-3.5 py-1 border border-line"
              style={{
                backgroundColor: isDark
                  ? "rgba(0, 0, 0, 0.5)"
                  : "rgba(255, 255, 255, 0.9)",
              }}
            >
              <Text className="text-sm font-semibold text-text">Lewati</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Pager */}
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        getItemLayout={(_, i) => ({
          length: screenWidth,
          offset: screenWidth * i,
          index: i,
        })}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            listRef.current?.scrollToIndex({
              index: info.index,
              animated: false,
            });
          }, 50);
        }}
        renderItem={({ item }) => (
          <View style={{ width: screenWidth }} className="flex-1">
            {/* Hero image container with explicit dynamic height */}
            <View
              className="relative w-full overflow-hidden bg-surface-2"
              style={{ height: heroHeight }}
            >
              <Image
                source={item.localImage}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                transition={150}
              />

              {/* Hardware-accelerated LinearGradient overlay fading image into bg */}
              <LinearGradient
                colors={["transparent", colors.bg]}
                locations={[0.2, 1.0]}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: Math.round(heroHeight * 0.45),
                }}
              />
            </View>

            {/* Copy section */}
            <View className="flex-1 px-6 pt-4 justify-start">
              <Text className="text-xs font-bold uppercase tracking-widest text-orange">
                {item.subtitle}
              </Text>
              <Text
                className="mt-2 text-2xl font-extrabold tracking-tight text-text leading-tight"
                style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
              >
                {item.title}
              </Text>
              <Text
                className="mt-3 text-sm leading-6 text-text-dim"
                style={{ fontFamily: "PlusJakartaSans_400Regular" }}
              >
                {item.description}
              </Text>
            </View>
          </View>
        )}
      />

      {/* Controls */}
      <View
        className="px-6 pt-2"
        style={{ paddingBottom: Math.max(insets.bottom, 20) }}
      >
        {/* Interactive Dots */}
        <View className="mb-5 flex-row items-center justify-center gap-2">
          {SLIDES.map((s, i) => {
            const active = i === index;
            return (
              <Pressable
                key={s.key}
                onPress={() => scrollToSlide(i)}
                accessibilityRole="button"
                accessibilityLabel={`Ke slide ${i + 1}`}
                hitSlop={8}
                className="py-2"
              >
                <View
                  className={
                    active
                      ? "h-2.5 w-8 rounded-full bg-brand"
                      : "h-2.5 w-2.5 rounded-full bg-surface-3"
                  }
                  style={!active ? { opacity: 0.6 } : undefined}
                />
              </Pressable>
            );
          })}
        </View>

        {/* Next / Start CTA Button */}
        <Button
          title={isLast ? "Mulai Sekarang" : "Lanjut"}
          variant="cta"
          onPress={goNext}
        />
      </View>
    </View>
  );
}



