import React, { memo, useCallback } from "react";
import { Pressable, Share, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStore } from "../../stores/themeStore";
import { formatDistanceToNow } from "../../utils/datetime";
import type { NewsItem } from "../../types";

interface NewsCardProps {
  item: NewsItem;
  onPress: () => void;
  /** Featured: hero image + overlay title. Default: compact thumbnail row. */
  featured?: boolean;
}

async function shareItem(item: NewsItem) {
  try {
    const articleUrl = item.url ?? "https://radiogaulfmsmg.com";
    await Share.share({
      title: item.title,
      message: `${item.title}\n\nBaca selengkapnya di Gaul FM: ${articleUrl}`,
      url: articleUrl,
    });
  } catch {
    // User dismissed the share sheet.
  }
}

const FeaturedCard = memo(function FeaturedCard({
  item,
  onPress,
}: NewsCardProps) {
  const colors = useThemeStore((s) => s.colors);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Berita utama: ${item.title}`}
      className="overflow-hidden rounded-2xl bg-surface active:opacity-95"
    >
      <View className="relative h-[220px] w-full bg-surface-3">
        {item.image_url ? (
          <Image
            source={{ uri: item.image_url }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            recyclingKey={item.id}
            cachePolicy="memory-disk"
            transition={150}
          />
        ) : (
          <View className="h-full w-full items-center justify-center">
            <Ionicons
              name="newspaper-outline"
              size={40}
              color={colors.textDim}
            />
          </View>
        )}
        <View className="absolute inset-x-0 bottom-0 h-2/3 bg-black/70" />
        <View className="absolute inset-x-0 bottom-0 h-1/3 bg-black/40" />

        {item.category ? (
          <View className="absolute left-4 top-4 rounded-full bg-brand/25 px-3 py-1.5">
            <Text
              className="text-[10px] font-extrabold uppercase tracking-widest text-brand"
              style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
            >
              {item.category}
            </Text>
          </View>
        ) : null}

        <View className="absolute inset-x-0 bottom-0 p-4">
          <Text
            className="text-2xl font-extrabold leading-7 text-white"
            numberOfLines={2}
            style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
          >
            {item.title}
          </Text>
          <View className="mt-2 flex-row items-center gap-1.5">
            <Ionicons name="time-outline" size={12} color="#FFFFFFCC" />
            <Text
              className="text-xs font-medium text-white/80"
              style={{ fontFamily: "PlusJakartaSans_500Medium" }}
            >
              {formatDistanceToNow(item.published_at)}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
});

const CompactCard = memo(function CompactCard({
  item,
  onPress,
}: NewsCardProps) {
  const colors = useThemeStore((s) => s.colors);
  const onShare = useCallback(() => {
    void shareItem(item);
  }, [item]);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={item.title}
      className="flex-row gap-3 rounded-xl bg-surface p-3 active:opacity-90"
    >
      <View className="h-[92px] w-[112px] overflow-hidden rounded-lg bg-surface-3">
        {item.image_url ? (
          <Image
            source={{ uri: item.image_url }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            recyclingKey={item.id}
            cachePolicy="memory-disk"
            transition={100}
          />
        ) : (
          <View className="h-full w-full items-center justify-center">
            <Ionicons
              name="newspaper-outline"
              size={22}
              color={colors.textDim}
            />
          </View>
        )}
      </View>

      <View className="min-w-0 flex-1 justify-center">
        {item.category ? (
          <Text
            className="self-start rounded-sm bg-brand/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-brand"
            style={{ fontFamily: "PlusJakartaSans_700Bold" }}
          >
            {item.category}
          </Text>
        ) : null}
        <Text
          className={`${item.category ? "mt-1" : ""} text-[15px] font-bold leading-5 text-text`}
          numberOfLines={2}
          style={{ fontFamily: "PlusJakartaSans_700Bold" }}
        >
          {item.title}
        </Text>
        <View className="mt-1.5 flex-row items-center justify-between">
          <View className="flex-row items-center gap-1">
            <Ionicons name="time-outline" size={11} color={colors.textDim} />
            <Text
              className="text-[11px] text-text-dim"
              style={{ fontFamily: "PlusJakartaSans_400Regular" }}
            >
              {formatDistanceToNow(item.published_at)}
            </Text>
          </View>
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              onShare();
            }}
            accessibilityRole="button"
            accessibilityLabel="Bagikan berita"
            hitSlop={10}
            className="min-h-9 min-w-9 items-center justify-center"
          >
            <Ionicons
              name="share-social-outline"
              size={17}
              color={colors.textDim}
            />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
});

/**
 * News card — memoized for FlatList. Featured hero / compact row.
 * UX redesign: Featured card is taller with stronger scrim and bigger title.
 * Compact cards have better spacing and larger touch targets.
 */
export const NewsCard = memo(function NewsCard({
  item,
  onPress,
  featured = false,
}: NewsCardProps) {
  if (featured) return <FeaturedCard item={item} onPress={onPress} />;
  return <CompactCard item={item} onPress={onPress} />;
});
