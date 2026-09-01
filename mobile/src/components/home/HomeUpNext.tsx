import React, { useCallback } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CommonActions, useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useThemeStore } from "../../stores/themeStore";
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
    navigation.dispatch(
      CommonActions.navigate({
        name: "Schedule",
        params: {
          state: {
            routes: [
              {
                name: "ProgramDetail",
                params: { id: program.id, fromHome: true },
              },
            ],
            index: 0,
          },
        },
      }),
    );
  }, [navigation, program.id]);

  return (
    <Pressable
      onPress={openDetail}
      accessibilityRole="button"
      accessibilityLabel={`Berikutnya: ${program.name} pukul ${program.start_time}. Buka detail program.`}
      className="mt-3 flex-row items-center gap-3 rounded-xl bg-surface-2 px-4 py-3 active:opacity-85"
    >
      {/* Time badge — clear visual anchor */}
      <View className="h-11 w-11 items-center justify-center rounded-lg bg-orange/15">
        <Text
          className="text-[12px] font-extrabold text-orange"
          style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
        >
          {program.start_time}
        </Text>
      </View>

      {/* Program info — label + name + host */}
      <View className="min-w-0 flex-1">
        <Text
          className="text-[10px] font-bold uppercase tracking-widest text-text-dim"
          style={{ fontFamily: "PlusJakartaSans_700Bold" }}
        >
          Berikutnya
        </Text>
        <Text
          className="text-[14px] font-bold text-text"
          numberOfLines={1}
          style={{ fontFamily: "PlusJakartaSans_700Bold" }}
        >
          {program.name}
        </Text>
      </View>

      {/* Chevron — tap affordance */}
      <View className="h-7 w-7 items-center justify-center rounded-full bg-surface-3">
        <Ionicons name="chevron-forward" size={14} color={colors.textDim} />
      </View>
    </Pressable>
  );
}
