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
          backgroundColor: `${color}15`,
          borderColor: `${color}40`,
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
  },
});

export default AMCBadge;
