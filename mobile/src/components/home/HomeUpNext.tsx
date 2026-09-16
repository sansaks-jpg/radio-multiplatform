import React, { useCallback } from "react";
import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useThemeStore } from "../../stores/themeStore";
import { getProgramArtwork } from "../../utils/programAssets";
import type { MainTabParamList, Program } from "../../types";

interface HomeUpNextProps {
  program: Program;
}

/**
 * "Berikutnya" strip on Home — next program today.
 * Compact pill attached to hero. One quick glance, one tap to schedule.
 */
export function HomeUpNext({ program }: HomeUpNextProps) {
  const colors = useThemeStore((s) => s.colors);
  const navigation =
    useNavigation<BottomTabNavigationProp<MainTabParamList>>();

  const openDetail = useCallback(() => {
    navigation.navigate("Schedule", {
      screen: "ProgramDetail",
      params: { id: program.id, fromHome: true },
    });
  }, [navigation, program.id]);

  const artwork = getProgramArtwork(program.name, program.cover_url);

  return (
    <Pressable
      onPress={openDetail}
      accessibilityRole="button"
      accessibilityLabel={`Sesi berikutnya: ${program.name} pukul ${program.start_time}. Buka detail program.`}
      className="flex-row items-center gap-2.5 rounded-2xl border border-line/20 bg-surface-2 p-2 active:opacity-85 shadow-sm"
    >
      {/* Logo program resmi */}
      <View className="h-11 w-11 overflow-hidden rounded-xl border border-brand/30 bg-surface-3">
        <Image
          source={artwork}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          transition={150}
        />
      </View>

      {/* Program info — label + jam siaran + nama program */}
      <View className="min-w-0 flex-1 justify-center">
        <View className="flex-row items-center gap-1.5">
          <Text
            className="text-[10px] font-bold uppercase tracking-widest text-text-dim"
            style={{ fontFamily: "PlusJakartaSans_700Bold" }}
          >
            Sesi berikutnya
          </Text>
          <Text className="text-[10px] text-text-dim">·</Text>
          <View className="flex-row items-center gap-1 rounded-full bg-orange/15 px-2 py-0.5">
            <Ionicons name="time-outline" size={10} color={colors.orange} />
            <Text
              className="text-[10px] font-bold text-orange"
              style={{ fontFamily: "PlusJakartaSans_700Bold" }}
            >
              {program.start_time} WIB
            </Text>
          </View>
        </View>

        <Text
          className="mt-0.5 text-[13px] font-extrabold text-text"
          numberOfLines={2}
          style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
        >
          {program.name}
        </Text>
      </View>

      {/* Chevron — tap affordance */}
      <View className="h-7 w-7 items-center justify-center rounded-full bg-surface-3 mr-1">
        <Ionicons name="chevron-forward" size={14} color={colors.textDim} />
      </View>
    </Pressable>
  );
}
