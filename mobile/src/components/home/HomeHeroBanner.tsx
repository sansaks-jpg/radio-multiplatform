import React, { useCallback, useMemo, useState } from "react";
import { Pressable, useWindowDimensions, View } from "react-native";
import { Image, type ImageSource } from "expo-image";
import { Carousel } from "react-native-reanimated-carousel";
import type { Banner } from "../../types";

interface HomeHeroBannerProps {
  banners: Banner[];
  onPress?: (banner: Banner) => void;
  autoPlayIntervalMs?: number;
}

/**
 * Resolve a banner's image into something `expo-image` can render.
 */
function resolveBannerSource(item: Banner): ImageSource | number | null {
  const raw = item.image_source;

  if (typeof raw === "number") return raw;
  if (typeof raw === "string" && raw.length > 0) return { uri: raw };
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (typeof obj.default === "number") return obj.default;
    if (typeof obj.default === "string") return { uri: obj.default };
    if (typeof obj.uri === "string") return { uri: obj.uri };
  }
  if (item.image_url) return { uri: item.image_url };
  return null;
}

/**
 * Topmost full-bleed edge-to-edge auto-scrolling hero banner.
 * Uses react-native-reanimated-carousel for perfectly smooth infinite loops
 * and reliable 60fps auto-play.
 */
export function HomeHeroBanner({
  banners,
  onPress,
  autoPlayIntervalMs = 3500,
}: HomeHeroBannerProps) {
  const { width: windowWidth } = useWindowDimensions();
  // Ensure we don't pass 0 or NaN to Carousel width/height
  const bannerWidth = windowWidth > 0 ? windowWidth : 390;
  const bannerHeight = Math.round(bannerWidth / 2.38);

  const [activeRealIndex, setActiveRealIndex] = useState(0);

  const validBanners = useMemo(
    () =>
      banners.filter(
        (b) => b.is_active !== false && (b.image_source || b.image_url),
      ),
    [banners],
  );

  const isInfinite = validBanners.length > 1;

  const renderItem = useCallback(
    ({ item, index }: { item: Banner; index: number }) => {
      const source = resolveBannerSource(item);
      return (
        <Pressable
          key={`banner-item-${item.id ?? index}`}
          onPress={() => onPress?.(item)}
          accessibilityRole="button"
          accessibilityLabel={item.title}
          style={{ width: bannerWidth, height: bannerHeight }}
        >
          {source ? (
            <Image
              source={source}
              style={{ width: bannerWidth, height: bannerHeight }}
              contentFit="cover"
              priority="high"
              cachePolicy="memory-disk"
              recyclingKey={item.id}
            />
          ) : (
            <View
              style={{ width: bannerWidth, height: bannerHeight }}
              className="bg-surface-2 items-center justify-center"
            />
          )}
        </Pressable>
      );
    },
    [bannerWidth, bannerHeight, onPress]
  );

  if (validBanners.length === 0 || bannerHeight <= 0) return null;

  return (
    <View
      className="relative w-full overflow-hidden bg-surface-3"
      style={{ height: bannerHeight }}
    >
      <Carousel
        loop={isInfinite}
        itemSize={bannerWidth}
        style={{ width: bannerWidth, height: bannerHeight }}
        autoplay={isInfinite}
        autoplayInterval={autoPlayIntervalMs}
        data={validBanners}
        keyExtractor={(item) => item.id}
        onConfigurePanGesture={(gesture) => {
          gesture.activeOffsetX([-10, 10]).failOffsetY([-5, 5]);
        }}
        onSnapToItem={(index: number) => setActiveRealIndex(index)}
        renderItem={renderItem}
      />

      {/* Titik indikator bulat presisi & sinkron */}
      {isInfinite ? (
        <View className="absolute bottom-2.5 left-0 right-0 flex-row items-center justify-center pointer-events-none">
          <View className="flex-row items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1">
            {validBanners.map((b, idx) => {
              const active = idx === activeRealIndex;
              return (
                <View
                  key={`dot-${b.id}-${idx}`}
                  className={`h-1.5 rounded-full ${
                    active ? "w-4 bg-brand" : "w-1.5 bg-white/50"
                  }`}
                />
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}
