import React from "react";
import { Pressable, ScrollView, Text } from "react-native";

interface ChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

function Chip({ label, active, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`Filter kategori ${label}`}
      className={`rounded-full px-3.5 py-2 active:opacity-85 ${
        active ? "bg-brand" : "bg-surface"
      }`}
    >
      <Text
        className={`text-xs font-bold ${active ? "text-onbrand" : "text-text-dim"}`}
        style={{ fontFamily: "PlusJakartaSans_700Bold" }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

interface NewsCategoryChipsProps {
  categories: string[];
  selected: string | null;
  onSelect: (category: string | null) => void;
}

/**
 * Filter kategori berita — "Semua" + kategori unik dari artikel yang sudah
 * dimuat. Membantu pengguna langsung menuju topik yang diminati tanpa
 * scroll manual satu per satu.
 */
export function NewsCategoryChips({
  categories,
  selected,
  onSelect,
}: NewsCategoryChipsProps) {
  if (categories.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingRight: 4 }}
    >
      <Chip label="Semua" active={selected === null} onPress={() => onSelect(null)} />
      {categories.map((category) => (
        <Chip
          key={category}
          label={category}
          active={selected === category}
          onPress={() => onSelect(category)}
        />
      ))}
    </ScrollView>
  );
}
