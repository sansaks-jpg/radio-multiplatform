import React from "react";
import { ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useAnnouncers } from "../../hooks/useAnnouncers";
import { getProgramAnnouncers, isHostOnAir } from "../../utils/announcer";
import { useThemeStore } from "../../stores/themeStore";

export function ProgramHosts({ name, liveHost }: { name: string; liveHost?: string | null }) {
  const query = useAnnouncers();
  const colors = useThemeStore((state) => state.colors);
  const { announcers, label } = getProgramAnnouncers(query.data ?? [], name);
  if (!announcers.length) return null;
  return <View className="mt-4">
    <Text className="mb-3 text-xs font-bold text-text-dim" style={{ fontFamily: "PlusJakartaSans_700Bold" }}>{label}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 4 }}>
      {announcers.map((person) => <View key={person.id} className="w-20 items-center" accessible accessibilityLabel={`${person.name}${isHostOnAir(person.name, liveHost) ? ", sedang mengudara" : ""}`}>
        <View className={`h-14 w-14 overflow-hidden rounded-full border-2 bg-surface-3 ${isHostOnAir(person.name, liveHost) ? "border-orange" : "border-brand/30"}`}>
          {person.photo_url ? <Image source={{ uri: person.photo_url }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={150} /> : <View className="flex-1 items-center justify-center"><Ionicons name="mic-outline" size={22} color={colors.brand} /></View>}
        </View>
        <Text className="mt-2 text-center text-xs text-text" numberOfLines={2} style={{ fontFamily: "PlusJakartaSans_600SemiBold" }}>{person.nickname || person.name}</Text>
      </View>)}
    </ScrollView>
  </View>;
}
