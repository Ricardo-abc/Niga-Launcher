import React from "react";
import { StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { EffectProps } from "./types";

const GradientGlow: React.FC<EffectProps> = ({ intensity, children, style }) => {
  const alpha = Math.min(intensity / 100, 0.9);

  const colors: [string, string, ...string[]] = [
    "rgba(139, 92, 246, " + (alpha * 0.6).toFixed(2) + ")",
    "rgba(59, 130, 246, " + (alpha * 0.4).toFixed(2) + ")",
    "rgba(6, 182, 212, " + (alpha * 0.2).toFixed(2) + ")",
    "transparent",
  ];

  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, style]}
    >
      {children}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
});

export default GradientGlow;
