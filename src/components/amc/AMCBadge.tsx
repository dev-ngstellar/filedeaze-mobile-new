import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { useTheme } from "../../theme";

interface AMCBadgeProps {
  label?: string;
  /** false renders a muted/inactive style (e.g. expired or pending contracts). */
  active?: boolean;
  style?: ViewStyle;
}

/** Small "🟢 AMC Active" pill used on asset cards, ticket cards, and job cards to flag AMC coverage. */
export const AMCBadge: React.FC<AMCBadgeProps> = ({ label = "AMC Active", active = true, style }) => {
  const theme = useTheme();
  const color = active ? theme.colors.success : theme.colors.textMuted;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: active ? `${color}14` : `${color}0d`,
          borderColor: active ? `${color}35` : `${color}20`,
        },
        style,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
});

export default AMCBadge;
