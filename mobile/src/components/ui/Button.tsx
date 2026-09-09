import React from "react";
import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
  Text,
} from "react-native";
import { useThemeStore } from "../../stores/themeStore";
import ctaGradient from "../../../assets/cta-gradient.png";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "cta";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

const VARIANT_CLASSES: Record<
  Exclude<ButtonVariant, "cta">,
  { container: string; label: string }
> = {
  primary: { container: "bg-brand", label: "text-onbrand" },
  secondary: {
    container: "bg-surface-3 border border-line",
    label: "text-text",
  },
  danger: { container: "bg-transparent border border-live", label: "text-live" },
  ghost: {
    container: "bg-transparent border border-brand/40",
    label: "text-brand",
  },
};

/** Sonic Pulse buttons — primary green, cta orange streaming. */
export function Button({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  className = "",
}: ButtonProps) {
  const colors = useThemeStore((s) => s.colors);
  const glow = useThemeStore((s) => s.glow);
  const isDisabled = disabled || loading;

  if (variant === "cta") {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ busy: loading, disabled: isDisabled }}
        className={`min-h-12 overflow-hidden rounded-md ${
          isDisabled ? "opacity-50" : "active:opacity-90"
        } ${className}`}
        style={!isDisabled ? glow.orange : undefined}
      >
        <ImageBackground
          source={ctaGradient}
          resizeMode="stretch"
          className="min-h-12 flex-row items-center justify-center px-6 py-3"
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text
              className="text-base font-extrabold tracking-wide text-white"
              style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
            >
              {title}
            </Text>
          )}
        </ImageBackground>
      </Pressable>
    );
  }

  const v = VARIANT_CLASSES[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ busy: loading, disabled: isDisabled }}
      className={`min-h-12 flex-row items-center justify-center rounded-md px-6 py-3 ${v.container} ${
        isDisabled ? "opacity-50" : "active:opacity-80"
      } ${className}`}
      style={variant === "primary" && !isDisabled ? glow.brand : undefined}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "primary" ? colors.onBrand : colors.text}
        />
      ) : (
        <Text
          className={`text-base font-bold ${v.label}`}
          style={{ fontFamily: "PlusJakartaSans_700Bold" }}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}
