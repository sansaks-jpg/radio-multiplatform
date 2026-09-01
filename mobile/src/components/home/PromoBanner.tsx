import React, { useCallback, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewToken,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import type { Banner } from "../../types";
import { spacing } from "../../theme/tokens";
import { useThemeStore } from "../../stores/themeStore";
import { SectionHeader } from "../ui/SectionHeader";

interface PromoBannerProps {
  banners: Banner[];
  onPress?: (banner: Banner) => void;
}

/**
 * Dashboard carousel — program unggulan / event / slot iklan.
 * UX redesign: Clean, minimal — no type chips, no noisy labels.
 * Max 3 banners to avoid "too many, which one matters?" confusion.
 * Single subtle scrim, clear CTA, focus on image + title.
 */
export function PromoBanner({ banners, onPress }: PromoBannerProps) {
  const colors = useThemeStore((s) => s.colors);
  const { width } = useWindowDimensions();
  const bannerWidth = width - spacing.base * 2;
  const bannerHeight = Math.round(bannerWidth * 0.42);
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList<Banner>>(null);
  const indexRef = useRef(0);

  // Max 3 banners — avoid banner fatigue
  const displayBanners = banners.slice(0, 3);

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const w = e.nativeEvent.layoutMeasurement.width;
      const index = Math.round(
        e.nativeEvent.contentOffset.x / Math.max(w, 1),
      );
      if (index !== indexRef.current) setActiveIndex(index);
    },
    [],
  );

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0]?.index;
      if (typeof first === "number") setActiveIndex(first);
    },
  ).current;

  if (displayBanners.length === 0) return null;

  return (
    <View>
      <SectionHeader title="Rekomendasi untukmu" />
      <View className="mt-3">
        <FlatList
          ref={listRef}
          data={displayBanners}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          getItemLayout={(_, index) => ({
            length: bannerWidth,
            offset: bannerWidth * index,
            index,
          })}
          onMomentumScrollEnd={onMomentumScrollEnd}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          onScrollToIndexFailed={(info) => {
            setTimeout(
              () =>
                listRef.current?.scrollToIndex({
                  index: info.index,
                  animated: true,
                }),
              120,
            );
          }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onPress?.(item)}
              accessibilityRole="button"
              accessibilityLabel={item.title}
              className="active:opacity-95"
              style={{ width: bannerWidth }}
            >
              <View
                className="relative overflow-hidden rounded-2xl bg-surface"
                style={{ height: bannerHeight }}
              >
                {item.image_url ? (
                  <Image
                    source={{ uri: item.image_url }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                    transition={280}
                  />
                ) : (
                  <View className="h-full w-full items-center justify-center bg-surface-2">
                    <Ionicons
                      name="radio-outline"
                      size={36}
                      color={colors.textDim}
                    />
                  </View>
                )}

                {/* Single subtle gradient scrim — bottom only */}
                <View className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/50 to-transparent" />

                {/* Content — bottom, clean hierarchy */}
                <View className="absolute inset-x-0 bottom-0 p-4">
                  <Text
                    className="text-lg font-extrabold leading-6 text-white"
                    numberOfLines={2}
                    style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
                  >
                    {item.title}
                  </Text>
                  {item.cta_label ? (
                    <View className="mt-2.5 flex-row items-center self-start rounded-full bg-white px-3 py-1.5">
                      <Text
                        className="text-[11px] font-extrabold uppercase tracking-wide text-black"
                        style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
                      >
                        {item.cta_label}
                      </Text>
                      <Ionicons
                        name="arrow-forward"
                        size={11}
                        color="#000"
                        style={{ marginLeft: 4 }}
                      />
                    </View>
                  ) : null}
                </View>
              </View>
            </Pressable>
          )}
        />

        {/* Pagination dots — only if more than 1 */}
        {displayBanners.length > 1 ? (
          <View className="mt-3 flex-row justify-center gap-1.5">
            {displayBanners.map((b, idx) => (
              <View
                key={b.id}
                accessibilityLabel={`Banner ${idx + 1} dari ${displayBanners.length}`}
                className={`h-1.5 rounded-full ${
                  idx === activeIndex ? "w-6 bg-brand" : "w-1.5 bg-line"
                }`}
              />
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}
