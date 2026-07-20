import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Minus, Plus, Trash2 } from "lucide-react-native";
import { useTheme } from "../../theme";
import { AppCard } from "../AppCard";
import { WarrantySelector } from "./WarrantySelector";
import { SparePartUsageDraft, SparePartCoverageType } from "../../services/job.service";

interface SparePartUsageRowProps {
  item: SparePartUsageDraft;
  onChangeQuantity: (quantity: number) => void;
  onChangeWarranty: (status: SparePartCoverageType) => void;
  onRemove: () => void;
  /** Shown when the technician tried to submit with this row's warranty status unset. */
  warrantyError?: boolean;
}

/** One spare-part line: name/unit price, quantity stepper, mandatory warranty selector, remove.
 * Reused for both the Complete Job "spare parts used" list and the Collect Payment "add spare
 * part" list — same shape, different destination array on submit. */
export const SparePartUsageRow: React.FC<SparePartUsageRowProps> = ({
  item,
  onChangeQuantity,
  onChangeWarranty,
  onRemove,
  warrantyError,
}) => {
  const theme = useTheme();

  // Informational only — the technician's own picked unit price × quantity. The backend computes
  // the authoritative calculatedAmount; this is never sent, just a helpful estimate for the row.
  const estimate = item.warrantyStatus === "WARRANTY" ? 0 : item.unitPrice * item.quantity;

  return (
    <AppCard style={styles.card}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={[styles.partName, { color: theme.colors.text }]} numberOfLines={1}>
            {item.partName}
          </Text>
          <Text style={[styles.unitPrice, { color: theme.colors.textMuted }]}>
            ₹{item.unitPrice.toLocaleString("en-IN")} / unit
          </Text>
        </View>
        <Pressable onPress={onRemove} hitSlop={8} style={styles.removeBtn}>
          <Trash2 size={16} color={theme.colors.danger} />
        </Pressable>
      </View>

      <View style={styles.qtyRow}>
        <Text style={[styles.qtyLabel, { color: theme.colors.textMuted }]}>Quantity</Text>
        <View style={styles.stepper}>
          <Pressable
            onPress={() => onChangeQuantity(Math.max(1, item.quantity - 1))}
            style={[styles.stepperBtn, { borderColor: theme.colors.borderLight }]}
          >
            <Minus size={14} color={theme.colors.text} />
          </Pressable>
          <Text style={[styles.qtyValue, { color: theme.colors.text }]}>{item.quantity}</Text>
          <Pressable
            onPress={() => onChangeQuantity(item.quantity + 1)}
            style={[styles.stepperBtn, { borderColor: theme.colors.borderLight }]}
          >
            <Plus size={14} color={theme.colors.text} />
          </Pressable>
        </View>
      </View>

      <View style={{ marginTop: 8 }}>
        <Text style={[styles.qtyLabel, { color: theme.colors.textMuted, marginBottom: 4 }]}>
          Warranty Status <Text style={{ color: theme.colors.danger }}>*</Text>
        </Text>
        <WarrantySelector value={item.warrantyStatus} onChange={onChangeWarranty} error={warrantyError} />
      </View>

      <View style={[styles.estimateRow, { borderTopColor: theme.colors.borderLight }]}>
        <Text style={[styles.estimateLabel, { color: theme.colors.textMuted }]}>Est. Amount</Text>
        <Text style={[styles.estimateValue, { color: theme.colors.text }]}>
          {item.warrantyStatus === "WARRANTY" ? "₹0 (Warranty)" : `₹${estimate.toLocaleString("en-IN")}`}
        </Text>
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  card: { padding: 12, marginBottom: 8 },
  headerRow: { flexDirection: "row", alignItems: "center" },
  partName: { fontSize: 13, fontWeight: "700" },
  unitPrice: { fontSize: 11, marginTop: 1 },
  removeBtn: { padding: 4 },
  qtyRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  qtyLabel: { fontSize: 11, fontWeight: "600" },
  stepper: { flexDirection: "row", alignItems: "center", gap: 6 },
  stepperBtn: { width: 24, height: 24, borderRadius: 6, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  qtyValue: { fontSize: 13, fontWeight: "700", minWidth: 16, textAlign: "center" },
  estimateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  estimateLabel: { fontSize: 11, fontWeight: "500" },
  estimateValue: { fontSize: 12, fontWeight: "700" },
});

export default SparePartUsageRow;
