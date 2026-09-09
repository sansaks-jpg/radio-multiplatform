import React, { useCallback, useMemo, useState } from "react";
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
import { NewsCategoryChips } from "../../components/news/NewsCategoryChips";

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

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  /** Unique categories from articles loaded so far, in first-seen order. */
  const categories = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const item of items) {
      if (item.category && !seen.has(item.category)) {
        seen.add(item.category);
        list.push(item.category);
      }
    }
    return list;
  }, [items]);

  const filteredItems = useMemo(
    () =>
      selectedCategory
        ? items.filter((item) => item.category === selectedCategory)
        : items,
    [items, selectedCategory],
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
        {categories.length > 0 ? (
          <View className="mt-4">
            <NewsCategoryChips
              categories={categories}
              selected={selectedCategory}
              onSelect={setSelectedCategory}
            />
          </View>
        ) : null}
      </View>
    ),
    [categories, selectedCategory],
  );

  return (
    <Screen dockInset="dock">
      <FlatList
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 24,
        }}
        data={filteredItems}
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
          ) : selectedCategory && items.length > 0 ? (
            <EmptyState
              icon="funnel-outline"
              title="Tidak ada berita"
              message={`Belum ada berita untuk kategori "${selectedCategory}".`}
              actionTitle="Tampilkan semua berita"
              onAction={() => setSelectedCategory(null)}
            />
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
