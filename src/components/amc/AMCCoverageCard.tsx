import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Check } from "lucide-react-native";
import { useTheme } from "../../theme";
import { AppCard } from "../AppCard";

interface AMCCoverageCardProps {
  /** Free-text coverage terms from the contract or plan — shown below the checklist when present. */
  coverageTerms?: string | null;
}

/** Coverage checklist for an active AMC contract. Service charge and labour charge are always
 * waived under AMC per backend billing rules (see resolveBillingWaivers) — this card reflects
 * that fixed policy, it does not read a per-contract flag. */
export const AMCCoverageCard: React.FC<AMCCoverageCardProps> = ({ coverageTerms }) => {
  const theme = useTheme();

  const items = ["Service Charges", "Labour Charges"];

  return (
    <AppCard style={styles.card}>
      {items.map((item) => (
        <View key={item} style={styles.row}>
          <View style={[styles.checkCircle, { backgroundColor: `${theme.colors.success}15` }]}>
            <Check size={12} color={theme.colors.success} />
          </View>
          <Text style={[styles.itemText, { color: theme.colors.text }]}>{item}</Text>
        </View>
      ))}

      {coverageTerms ? (
        <>
          <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />
          <Text style={[styles.termsLabel, { color: theme.colors.textMuted }]}>Coverage Terms</Text>
          <Text style={[styles.termsText, { color: theme.colors.text }]}>{coverageTerms}</Text>
        </>
      ) : null}
    </AppCard>
  );
};

const styles = StyleSheet.create({
  card: { padding: 16 },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  checkCircle: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", marginRight: 10 },
  itemText: { fontSize: 13, fontWeight: "600" },
  divider: { height: 1, marginVertical: 10 },
  termsLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  termsText: { fontSize: 13, lineHeight: 18 },
});

export default AMCCoverageCard;
