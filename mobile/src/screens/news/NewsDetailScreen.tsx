import React, { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import {
  CommonActions,
  useFocusEffect,
  useNavigation,
  useRoute,
  type RouteProp,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useThemeStore } from "../../stores/themeStore";
import type { NewsStackParamList } from "../../types";
import {
  flattenNewsPages,
  useNewsItem,
  type NewsPage,
} from "../../hooks/useNews";
import { formatDateID, formatDistanceToNow } from "../../utils/datetime";
import { htmlToParagraphs } from "../../utils/html";
import { Screen } from "../../components/ui/Screen";
import { EmptyState } from "../../components/ui/EmptyState";
import { Button } from "../../components/ui/Button";
import { spacing } from "../../theme/tokens";

/**
 * Article reader: hero + meta + paragraphs.
 * Resolves item from infinite-query cache, then WordPress / mock by id.
 *
 * Header (back / share) is rendered as a fixed overlay OUTSIDE the
 * ScrollView, so it stays reachable while the article scrolls underneath —
 * no need to scroll back to the top just to go back.
 */
export function NewsDetailScreen() {
  const colors = useThemeStore((s) => s.colors);
  const navigation =
    useNavigation<NativeStackNavigationProp<NewsStackParamList>>();
  const route = useRoute<RouteProp<NewsStackParamList, "NewsDetail">>();
  const queryClient = useQueryClient();
  const id = route.params.id;
  const fromHome = route.params.fromHome === true;

  /**
   * Back behavior:
   * - from Home preview → Home tab + clean News stack (feed only)
   * - from News feed → goBack to feed
   */
  const handleBack = useCallback(() => {
    if (fromHome) {
      const tabNav = navigation.getParent();
      // Switch to Home first so the user never sees an intermediate NewsFeed.
      tabNav?.navigate("Home" as never);
      // Then wipe nested News history so the next News open is fresh.
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "NewsFeed" }],
        }),
      );
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate("NewsFeed");
  }, [fromHome, navigation]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (fromHome) {
          handleBack();
          return true;
        }
        return false;
      };
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );
      return () => subscription.remove();
    }, [fromHome, handleBack]),
  );

  // List cache is lean (no HTML body) — always fetch full post for reader.
  const fromCache = useMemo(() => {
    const cached = queryClient.getQueryData<InfiniteData<NewsPage>>([
      "news",
      "v2",
    ]);
    return flattenNewsPages(cached?.pages).find((n) => n.id === id) ?? null;
  }, [queryClient, id]);

  const remote = useNewsItem(id);
  const item =
    remote.data && remote.data.content.length > 0
      ? remote.data
      : (fromCache ?? remote.data ?? null);
  const loading = !item?.content && remote.isLoading;

  const paragraphs = useMemo(
    () => (item ? htmlToParagraphs(item.content) : []),
    [item],
  );

  const share = async () => {
    if (!item) return;
    try {
      const articleUrl = item.url ?? "https://radiogaulfmsmg.com";
      await Share.share({
        title: item.title,
        message: `${item.title}\n\nBaca selengkapnya di Gaul FM: ${articleUrl}`,
        url: articleUrl,
      });
    } catch {
      // Share sheet dismissed.
    }
  };

  return (
    <Screen dockInset="dock" contentStyle={{ paddingHorizontal: 0 }}>
      <View className="flex-1">
        {/* Fixed header — stays put while the article scrolls underneath. */}
        <View className="absolute left-4 right-4 top-1 z-10 flex-row items-center justify-between">
          <Pressable
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Kembali"
            hitSlop={10}
            className="h-11 w-11 items-center justify-center rounded-full bg-black/50"
          >
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </Pressable>
          <Pressable
            onPress={() => void share()}
            accessibilityRole="button"
            accessibilityLabel="Bagikan berita"
            hitSlop={10}
            className="h-11 w-11 items-center justify-center rounded-full bg-black/50"
          >
            <Ionicons name="share-social-outline" size={19} color="#FFFFFF" />
          </Pressable>
        </View>

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: spacing.lg }}
        >
          {loading ? (
            <View className="mt-24 items-center">
              <ActivityIndicator color={colors.brand} size="large" />
              <Text
                className="mt-3 text-sm text-text-dim"
                style={{ fontFamily: "PlusJakartaSans_400Regular" }}
              >
                Memuat artikel…
              </Text>
            </View>
          ) : remote.isError && !item?.content ? (
            <View className="mt-14 px-4 items-center">
              <EmptyState
                icon="wifi-outline"
                title="Gagal memuat berita"
                message="Terjadi gangguan jaringan atau artikel belum diunduh."
              />
              <View className="mt-4 w-48">
                <Button
                  title="Coba Lagi"
                  onPress={() => remote.refetch()}
                  variant="secondary"
                />
              </View>
            </View>
          ) : !item ? (
            <View className="mt-14 px-4">
              <EmptyState
                icon="document-outline"
                title="Berita tidak ditemukan"
                message="Artikel ini belum tersimpan di perangkat. Buka kembali saat online."
              />
            </View>
          ) : (
            <View>
              <View className="relative aspect-[16/10] w-full bg-surface-3">
                {item.image_url ? (
                  <Image
                    source={{ uri: item.image_url }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                    transition={280}
                  />
                ) : (
                  <View className="h-full w-full items-center justify-center">
                    <Ionicons
                      name="newspaper-outline"
                      size={48}
                      color={colors.textDim}
                    />
                  </View>
                )}
                <View className="absolute inset-x-0 bottom-0 h-3/5 bg-black/55" />
                <View className="absolute inset-x-0 bottom-0 h-1/3 bg-black/30" />

                <View className="absolute inset-x-0 bottom-0 p-4">
                  {item.category ? (
                    <View className="mb-2.5 self-start rounded-full bg-brand/25 px-2.5 py-1">
                      <Text
                        className="text-[10px] font-extrabold uppercase tracking-widest text-brand"
                        style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
                      >
                        {item.category}
                      </Text>
                    </View>
                  ) : null}
                  <Text
                    className="text-[22px] font-extrabold leading-7 tracking-tight text-white"
                    style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
                  >
                    {item.title}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center gap-2 border-b border-line/40 px-4 py-3">
                <Ionicons
                  name="time-outline"
                  size={13}
                  color={colors.textDim}
                />
                <Text
                  className="text-xs text-text-dim"
                  style={{ fontFamily: "PlusJakartaSans_500Medium" }}
                >
                  {formatDistanceToNow(item.published_at)} ·{" "}
                  {formatDateID(item.published_at)}
                </Text>
              </View>

              <View className="mt-5 gap-4 px-4">
                {paragraphs.map((paragraph, index) => (
                  <Text
                    key={`${item.id}-p-${index}`}
                    className="text-base leading-7 text-text"
                    style={{ fontFamily: "PlusJakartaSans_400Regular" }}
                  >
                    {paragraph}
                  </Text>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </Screen>
  );
}
