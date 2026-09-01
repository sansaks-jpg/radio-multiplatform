import React, { useState, forwardRef } from "react";
import {
  Pressable,
  Text,
  TextInput as RNTextInput,
  View,
  type TextInputProps as RNTextInputProps,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStore } from "../../stores/themeStore";

export interface TextInputProps extends Omit<RNTextInputProps, "className"> {
  label?: string;
  error?: string | null;
  icon?: keyof typeof Ionicons.glyphMap;
  className?: string;
}

/** Field — surface-2 fill, On-Air Orange focus. */
export const TextInput = forwardRef<RNTextInput, TextInputProps>(
  (
    {
      label,
      error,
      icon,
      secureTextEntry,
      className = "",
      onFocus,
      onBlur,
      ...rest
    },
    ref,
  ) => {
    const colors = useThemeStore((s) => s.colors);
    const [hidden, setHidden] = useState(Boolean(secureTextEntry));
    const [focused, setFocused] = useState(false);
    const isPassword = Boolean(secureTextEntry);

    return (
      <View className={`w-full ${className}`}>
        {label ? (
          <Text
            className="mb-2 text-xs font-bold uppercase tracking-widest text-text-dim"
            style={{ fontFamily: "PlusJakartaSans_700Bold" }}
          >
            {label}
          </Text>
        ) : null}
        <View
          className={`min-h-12 flex-row items-center rounded-md border bg-surface-2 px-4 ${
            error ? "border-live" : focused ? "border-orange" : "border-line"
          }`}
        >
          {icon ? (
            <Ionicons
              name={icon}
              size={20}
              color={
                error ? colors.live : focused ? colors.orange : colors.textDim
              }
              style={{ marginRight: 12 }}
            />
          ) : null}
          <RNTextInput
            ref={ref}
            className="flex-1 py-3 text-base text-text"
            placeholderTextColor={colors.textDim}
            secureTextEntry={isPassword && hidden}
            autoCapitalize="none"
            accessibilityLabel={label || rest.placeholder}
            accessibilityHint={error || undefined}
            style={{ fontFamily: "PlusJakartaSans_400Regular" }}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            {...rest}
          />
          {isPassword ? (
            <Pressable
              onPress={() => setHidden((h) => !h)}
              accessibilityRole="button"
              accessibilityLabel={
                hidden ? "Tampilkan password" : "Sembunyikan password"
              }
              hitSlop={12}
              className="ml-2 min-h-11 min-w-11 items-center justify-center"
            >
              <Ionicons
                name={hidden ? "eye-off-outline" : "eye-outline"}
                size={22}
                color={colors.textDim}
              />
            </Pressable>
          ) : null}
        </View>
        {error ? (
          <Text
            className="mt-1.5 text-sm text-live"
            style={{ fontFamily: "PlusJakartaSans_400Regular" }}
          >
            {error}
          </Text>
        ) : null}
      </View>
    );
  },
);

TextInput.displayName = "TextInput";
