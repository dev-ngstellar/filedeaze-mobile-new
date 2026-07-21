import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../../theme";
import { AppCard } from "../AppCard";

interface AMCVisitCardProps {
  totalVisits?: number;
  completedVisits?: number;
  remainingVisits?: number;
}

/** Visits / Completed / Remaining stat row for an AMC contract — all values sourced from the
 * backend subscription record, never computed or hardcoded on device. */
export const AMCVisitCard: React.FC<AMCVisitCardProps> = ({ totalVisits, completedVisits, remainingVisits }) => {
  const theme = useTheme();

  const totalVis = totalVisits ?? 0;
  const remVis = remainingVisits ?? 0;
  const usedVis = Math.max(0, totalVis - remVis);

  const stats: { label: string; value: string; color: string }[] = [
    { label: "Total Visits", value: String(totalVis), color: theme.colors.text },
    { label: "Used Visits", value: `${usedVis} / ${totalVis}`, color: theme.colors.success },
    { label: "Remaining", value: String(remVis), color: theme.colors.primary },
  ];

  return (
    <AppCard style={styles.card}>
      {stats.map((stat, idx) => (
        <React.Fragment key={stat.label}>
          {idx > 0 && <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />}
          <View style={styles.statCell}>
            <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>{stat.label}</Text>
          </View>
        </React.Fragment>
      ))}
    </AppCard>
  );
};

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", paddingVertical: 16 },
  statCell: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "800" },
  statLabel: { fontSize: 11, fontWeight: "600", marginTop: 4, textTransform: "uppercase", letterSpacing: 0.4 },
  divider: { width: 1, alignSelf: "stretch", marginVertical: 4 },
});

export default AMCVisitCard;
