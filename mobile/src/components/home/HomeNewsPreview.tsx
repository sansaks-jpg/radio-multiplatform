import React, { useCallback, useRef } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
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
 * Opens detail with a clean News stack + fromHome so
 * hardware/UI back returns to Home.
 */
export function HomeNewsPreview({ items }: HomeNewsPreviewProps) {
  const colors = useThemeStore((s) => s.colors);
  const navigation =
    useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const listRef = useRef<FlatList<NewsItem>>(null);

  const openDetail = useCallback(
    (id: string) => {
      navigation.navigate("News", {
        screen: "NewsDetail",
        params: { id, fromHome: true },
      });
    },
    [navigation],
  );

  if (items.length === 0) return null;

  return (
    <View className="mt-2 mb-6">
      <SectionHeader title="Berita terbaru" />

      <FlatList
        ref={listRef}
        data={items}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: spacing.base, marginTop: 14 }}
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
              className="overflow-hidden rounded-[24px] bg-surface border shadow-sm active:opacity-90"
              style={{ width: cardWidth, borderColor: `${colors.line}40` }}
            >
              <View className="relative h-[150px] w-full bg-surface-3">
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
                      size={32}
                      color={colors.textDim}
                    />
                  </View>
                )}
                
                {/* Gradient to make text readable */}
                <View className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                {item.category ? (
                  <View className="absolute left-3 top-3">
                    <Text
                      className="rounded-full bg-brand px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white"
                      style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
                    >
                      {item.category}
                    </Text>
                  </View>
                ) : null}

                <View className="absolute inset-x-0 bottom-0 px-4 pb-3">
                  <Text
                    className="text-[14px] font-extrabold leading-5 text-white"
                    numberOfLines={2}
                    style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
                  >
                    {item.title}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center gap-1.5 px-4 py-3">
                <Ionicons name="time-outline" size={12} color={colors.textDim} />
                <Text
                  className="text-[11px] font-medium text-text-dim"
                  style={{ fontFamily: "PlusJakartaSans_500Medium" }}
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
