import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  useThemeStore,
  type ThemePreference,
} from "../../stores/themeStore";

const OPTIONS: {
  key: ThemePreference;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: "system", label: "Sistem", icon: "phone-portrait-outline" },
  { key: "light", label: "Terang", icon: "sunny-outline" },
  { key: "dark", label: "Gelap", icon: "moon-outline" },
];

/** Profile settings — Sistem / Terang / Gelap. */
export function ThemeModePicker() {
  const preference = useThemeStore((s) => s.preference);
  const colors = useThemeStore((s) => s.colors);
  const setPreference = useThemeStore((s) => s.setPreference);

  return (
    <View className="flex-row gap-2">
      {OPTIONS.map((opt) => {
        const active = preference === opt.key;
        return (
          <Pressable
            key={opt.key}
            onPress={() => setPreference(opt.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Tema ${opt.label}`}
            className={`min-h-11 flex-1 items-center justify-center rounded-md border px-2 py-2.5 ${
              active
                ? "border-brand bg-brand/15"
                : "border-line/50 bg-surface-2"
            }`}
          >
            <Ionicons
              name={opt.icon}
              size={18}
              color={active ? colors.brand : colors.textDim}
            />
            <Text
              className={`mt-1 text-[11px] font-bold ${
                active ? "text-brand" : "text-text-dim"
              }`}
              style={{ fontFamily: "PlusJakartaSans_700Bold" }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
