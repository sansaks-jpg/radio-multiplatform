import React, { useCallback, useRef } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { CommonActions, useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useThemeStore } from "../../stores/themeStore";
import type { MainTabParamList, NewsItem } from "../../types";
import { formatDistanceToNow } from "../../utils/datetime";
import { SectionHeader } from "../ui/SectionHeader";
import { spacing } from "../../theme/tokens";

interface HomeNewsPreviewProps {
  items: NewsItem[];
}

const CARD_WIDTH = 200;
const CARD_GAP = 12;

/**
 * Dashboard news — horizontal cards.
 * Opens detail with a CLEAN News stack (only this article) + fromHome so
 * hardware/UI back returns to Home, not a stale previous NewsDetail.
 */
export function HomeNewsPreview({ items }: HomeNewsPreviewProps) {
  const colors = useThemeStore((s) => s.colors);
  const navigation =
    useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const listRef = useRef<FlatList<NewsItem>>(null);

  const openDetail = useCallback(
    (id: string) => {
      // Reset nested News stack so we never land on a previous article.
      // Single route: NewsDetail — back → Home (see NewsDetailScreen).
      navigation.dispatch(
        CommonActions.navigate({
          name: "News",
          params: {
            state: {
              routes: [
                {
                  name: "NewsDetail",
                  params: { id, fromHome: true },
                },
              ],
              index: 0,
            },
          },
        }),
      );
    },
    [navigation],
  );

  if (items.length === 0) return null;

  return (
    <View className="mt-8">
      <SectionHeader title="Berita terbaru" />

      <FlatList
        ref={listRef}
        data={items}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: spacing.base, marginTop: 12 }}
        ItemSeparatorComponent={() => <View style={{ width: CARD_GAP }} />}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => {
          const isFeatured = index === 0;
          const cardWidth = isFeatured ? CARD_WIDTH + 40 : CARD_WIDTH;

          return (
            <Pressable
              onPress={() => openDetail(item.id)}
              accessibilityRole="button"
              accessibilityLabel={item.title}
              className="overflow-hidden rounded-2xl bg-surface active:opacity-95"
              style={{ width: cardWidth }}
            >
              <View className="relative h-32 w-full bg-surface-3">
                {item.image_url ? (
                  <Image
                    source={{ uri: item.image_url }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <View className="h-full w-full items-center justify-center">
                    <Ionicons
                      name="newspaper-outline"
                      size={28}
                      color={colors.textDim}
                    />
                  </View>
                )}
                <View className="absolute inset-x-0 bottom-0 h-1/2 bg-black/60" />

                {item.category ? (
                  <View className="absolute left-2.5 top-2.5">
                    <Text
                      className="rounded-sm bg-brand/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-onbrand"
                      style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                    >
                      {item.category}
                    </Text>
                  </View>
                ) : null}

                <View className="absolute inset-x-0 bottom-0 p-3">
                  <Text
                    className="text-[13px] font-extrabold leading-4 text-white"
                    numberOfLines={2}
                    style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
                  >
                    {item.title}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center gap-1 px-3 py-2">
                <Ionicons name="time-outline" size={10} color={colors.textDim} />
                <Text
                  className="text-[10px] text-text-dim"
                  style={{ fontFamily: "PlusJakartaSans_400Regular" }}
                >
                  {formatDistanceToNow(item.published_at)}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
