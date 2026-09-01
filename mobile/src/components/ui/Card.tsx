import React from "react";
import { View } from "react-native";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Sonic Pulse card — tonal surface, soft 16px radius.
 * Minimal border; depth from surface hierarchy (DESIGN.md Cards).
 */
export function Card({ children, className = "" }: CardProps) {
  return (
    <View className={`rounded-card bg-surface p-4 ${className}`}>
      {children}
    </View>
  );
}
