import React, { useCallback, useMemo } from "react";
import { FlatList, Text, View, type ListRenderItem } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { NewsItem, NewsStackParamList } from "../../types";
import { flattenNewsPages, useNews } from "../../hooks/useNews";
import { Screen } from "../../components/ui/Screen";
import { TopNavbar } from "../../components/ui/TopNavbar";
import { OfflineBanner } from "../../components/ui/OfflineBanner";
import { Skeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { NewsCard } from "../../components/news/NewsCard";

/**
 * News feed: featured hero + compact rows, lean WP payload, tuned FlatList.
 */
export function NewsFeedScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<NewsStackParamList>>();
  const news = useNews();
  const items = useMemo(
    () => flattenNewsPages(news.data?.pages),
    [news.data?.pages],
  );

  const openDetail = useCallback(
    (item: NewsItem) => navigation.navigate("NewsDetail", { id: item.id }),
    [navigation],
  );

  const renderItem: ListRenderItem<NewsItem> = useCallback(
    ({ item, index }) => (
      <View className="mb-3">
        <NewsCard
          item={item}
          onPress={() => openDetail(item)}
          featured={index === 0}
        />
      </View>
    ),
    [openDetail],
  );

  const keyExtractor = useCallback((item: NewsItem) => item.id, []);

  const onEndReached = useCallback(() => {
    if (news.hasNextPage && !news.isFetchingNextPage) {
      void news.fetchNextPage();
    }
  }, [news]);

  const listHeader = useMemo(
    () => (
      <View className="mb-3">
        <TopNavbar className="mt-1" />
        <View className="mt-4">
          <Text
            className="text-[28px] font-extrabold tracking-tight text-text"
            style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
          >
            Berita
          </Text>
          <Text
            className="mt-1 text-sm text-text-dim"
            style={{ fontFamily: "PlusJakartaSans_400Regular" }}
          >
            Kabar terbaru Semarang & sekitarnya
          </Text>
        </View>
        <OfflineBanner message="Mode offline — menampilkan berita tersimpan" />
      </View>
    ),
    [],
  );

  return (
    <Screen dockInset="dock">
      <FlatList
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 24,
        }}
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        refreshing={news.isRefetching}
        onRefresh={() => void news.refetch()}
        onEndReachedThreshold={0.5}
        onEndReached={onEndReached}
        // Virtualization tuning — avoid "large list slow to update"
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={7}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews
        ListEmptyComponent={
          news.isLoading ? (
            <View className="gap-3">
              <Skeleton className="h-56 w-full rounded-xl" />
              <Skeleton className="h-[104px] w-full rounded-card" />
              <Skeleton className="h-[104px] w-full rounded-card" />
            </View>
          ) : news.isError ? (
            <ErrorState onRetry={() => void news.refetch()} />
          ) : (
            <EmptyState
              icon="newspaper-outline"
              title="Belum ada berita"
              message="Berita akan muncul di sini setelah tersinkron dari website Gaul FM."
            />
          )
        }
        ListFooterComponent={
          news.isFetchingNextPage ? (
            <Skeleton className="mt-1 h-[104px] w-full rounded-card" />
          ) : null
        }
      />
    </Screen>
  );
}
