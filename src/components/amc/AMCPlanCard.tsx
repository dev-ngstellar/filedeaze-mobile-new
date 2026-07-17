import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Shield, ChevronRight } from "lucide-react-native";
import { useTheme } from "../../theme";
import { AppCard } from "../AppCard";
import { AppBadge } from "../AppBadge";
import { AmcSubscriptionStatus } from "../../services/amc.service";

interface AMCPlanCardProps {
  planName: string;
  status: AmcSubscriptionStatus;
  /** e.g. "Expires 31 Dec 2026" */
  subtitle?: string;
  onPress?: () => void;
}

const STATUS_LABEL: Record<AmcSubscriptionStatus, string> = {
  ACTIVE: "Active",
  RENEWED: "Renewed",
  PENDING_APPROVAL: "Pending Approval",
  PAYMENT_PENDING: "Payment Pending",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

const STATUS_VARIANT: Record<AmcSubscriptionStatus, "success" | "warning" | "danger" | "primary"> = {
  ACTIVE: "success",
  RENEWED: "success",
  PENDING_APPROVAL: "warning",
  PAYMENT_PENDING: "warning",
  REJECTED: "danger",
  CANCELLED: "danger",
};

/** Compact plan header card — plan name, status badge, optional subtitle. Shared by the AMC
 * details screen and anywhere an asset's AMC contract needs a summary row. */
export const AMCPlanCard: React.FC<AMCPlanCardProps> = ({ planName, status, subtitle, onPress }) => {
  const theme = useTheme();

  return (
    <AppCard onPress={onPress} style={styles.card}>
      <View style={[styles.strip, { backgroundColor: theme.colors.primary }]} />
      <View style={styles.body}>
        <View style={[styles.iconCircle, { backgroundColor: `${theme.colors.primary}12` }]}>
          <Shield size={20} color={theme.colors.primary} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.planName, { color: theme.colors.text }]} numberOfLines={1}>
            {planName}
          </Text>
          <View style={styles.statusRow}>
            <AppBadge label={STATUS_LABEL[status] ?? status} variant={STATUS_VARIANT[status] ?? "primary"} />
          </View>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: theme.colors.textMuted }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {onPress ? <ChevronRight size={18} color={theme.colors.textMuted} /> : null}
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  card: { padding: 0, overflow: "hidden", marginBottom: 12 },
  strip: { height: 4, width: "100%" },
  body: { flexDirection: "row", alignItems: "center", padding: 16 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  planName: { fontSize: 16, fontWeight: "700" },
  statusRow: { marginTop: 6, flexDirection: "row" },
  subtitle: { fontSize: 12, marginTop: 6 },
});

export default AMCPlanCard;
