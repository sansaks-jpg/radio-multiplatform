import React from "react";
import { View } from "react-native";
import { Image } from "expo-image";

/**
 * Official Radio Gaul logo, used as-is (mobile/assets/logo.webp).
 * The source file is a 1600x899 canvas with transparent margins; the visible
 * artwork occupies ~64.4% of the canvas height (y 160..739) and ~98% of the
 * width. Sizes below refer to the VISIBLE artwork height, so the image box is
 * scaled up to compensate for the transparent margins.
 */
const CANVAS_AR = 1600 / 899;
const VISIBLE_Y = 579 / 899;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const logoSource = require("../../../assets/logo.webp");

interface BrandLogoProps {
  /** sm: header bars · md: compact headers · lg: splash / auth / about. */
  size?: "sm" | "md" | "lg";
}

const VISIBLE_HEIGHT = { sm: 30, md: 46, lg: 110 } as const;

export function BrandLogo({ size = "sm" }: BrandLogoProps) {
  const height = Math.round(VISIBLE_HEIGHT[size] / VISIBLE_Y);
  const width = Math.round(height * CANVAS_AR);
  return (
    <View accessibilityRole="image" accessibilityLabel="Radio Gaul 87.8 FM">
      <Image
        source={logoSource}
        style={{ width, height }}
        contentFit="contain"
        transition={120}
      />
    </View>
  );
}
