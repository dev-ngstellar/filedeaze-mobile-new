import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ShieldCheck, Receipt } from "lucide-react-native";
import { useTheme } from "../../theme";
import { AppCard } from "../AppCard";
import { AppButton } from "../AppButton";

export interface PaymentSummaryCardProps {
  title?: string;
  // Optional invoice/payment meta — shown as a header block above the charges when provided, so
  // this one component can also replace the old PaymentBreakdownCard's invoice-summary layout.
  invoiceNumber?: string;
  ticketNumber?: string;
  customerName?: string;
  paymentMode?: string;
  paymentStatus?: string;
  invoiceDate?: string;
  onViewInvoice?: () => void;
  serviceCharge: number;
  serviceChargeWaived?: boolean;
  labourCharge: number;
  labourChargeWaived?: boolean;
  sparePartsAmount: number;
  /** Omit entirely when the backend response doesn't include this field (e.g. persisted
   * invoices/payments don't store it — only the live preview / just-collected response do).
   * Leaving it undefined hides the Warranty Savings row, per business rule: never fabricate. */
  warrantyPartsValue?: number;
  additionalCharge?: number;
  discount?: number;
  subtotal?: number;
  gstPercent?: number;
  gstAmount?: number;
  grandTotal: number;
  currency?: string;
}

/** Universal payment breakdown — Service/Labour/Chargeable Spare Parts/Warranty Savings/
 * Additional/Discount/Subtotal/GST/Grand Total. Every field is displayed exactly as the backend
 * returned it; nothing here is recalculated. Reused across Payment Preview, Payment Success
 * (technician) and completed-ticket billing (customer) — callers just pass whatever subset of
 * fields their endpoint actually returns. */
export const PaymentSummaryCard: React.FC<PaymentSummaryCardProps> = ({
  title = "Payment Summary",
  invoiceNumber,
  ticketNumber,
  customerName,
  paymentMode,
  paymentStatus,
  invoiceDate,
  onViewInvoice,
  serviceCharge,
  serviceChargeWaived,
  labourCharge,
  labourChargeWaived,
  sparePartsAmount,
  warrantyPartsValue,
  additionalCharge,
  discount,
  subtotal,
  gstPercent,
  gstAmount,
  grandTotal,
  currency = "₹",
}) => {
  const theme = useTheme();
  const fmt = (n: number) => `${currency}${n.toLocaleString("en-IN")}`;
  const amcApplied = !!serviceChargeWaived || !!labourChargeWaived;

  return (
    <AppCard style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
        {amcApplied ? (
          <View style={[styles.amcTag, { backgroundColor: `${theme.colors.success}15` }]}>
            <ShieldCheck size={12} color={theme.colors.success} />
            <Text style={[styles.amcTagText, { color: theme.colors.success }]}>AMC Coverage Applied</Text>
          </View>
        ) : null}
      </View>

      {invoiceNumber || ticketNumber || customerName || paymentMode || paymentStatus || invoiceDate ? (
        <View style={[styles.metaBox, { borderColor: theme.colors.borderLight }]}>
          {invoiceNumber ? (
            <View style={styles.row}>
              <Text style={[styles.metaLabel, { color: theme.colors.textMuted }]}>Invoice No</Text>
              <Text style={[styles.metaValue, { color: theme.colors.text }]}>#{invoiceNumber}</Text>
            </View>
          ) : null}
          {ticketNumber ? (
            <View style={styles.row}>
              <Text style={[styles.metaLabel, { color: theme.colors.textMuted }]}>Ticket No</Text>
              <Text style={[styles.metaValue, { color: theme.colors.text }]}>{ticketNumber}</Text>
            </View>
          ) : null}
          {customerName ? (
            <View style={styles.row}>
              <Text style={[styles.metaLabel, { color: theme.colors.textMuted }]}>Customer</Text>
              <Text style={[styles.metaValue, { color: theme.colors.text }]}>{customerName}</Text>
            </View>
          ) : null}
          {paymentMode ? (
            <View style={styles.row}>
              <Text style={[styles.metaLabel, { color: theme.colors.textMuted }]}>Payment Mode</Text>
              <Text style={[styles.metaValue, { color: theme.colors.text }]}>{paymentMode}</Text>
            </View>
          ) : null}
          {paymentStatus ? (
            <View style={styles.row}>
              <Text style={[styles.metaLabel, { color: theme.colors.textMuted }]}>Payment Status</Text>
              <Text style={[styles.metaValue, { color: theme.colors.success }]}>{paymentStatus}</Text>
            </View>
          ) : null}
          {invoiceDate ? (
            <View style={styles.row}>
              <Text style={[styles.metaLabel, { color: theme.colors.textMuted }]}>Invoice Date</Text>
              <Text style={[styles.metaValue, { color: theme.colors.text }]}>{invoiceDate}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.colors.textMuted }]}>Service Charge</Text>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={[styles.value, { color: serviceChargeWaived ? theme.colors.success : theme.colors.text }]}>
            {serviceChargeWaived ? "FREE" : fmt(serviceCharge)}
          </Text>
          {serviceChargeWaived ? (
            <Text style={[styles.waivedTag, { color: theme.colors.success }]}>Covered by AMC</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.colors.textMuted }]}>Labour Charge</Text>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={[styles.value, { color: labourChargeWaived ? theme.colors.success : theme.colors.text }]}>
            {labourChargeWaived ? "FREE" : fmt(labourCharge)}
          </Text>
          {labourChargeWaived ? (
            <Text style={[styles.waivedTag, { color: theme.colors.success }]}>Covered by AMC</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.colors.textMuted }]}>Chargeable Spare Parts</Text>
        <Text style={[styles.value, { color: theme.colors.text }]}>{fmt(sparePartsAmount)}</Text>
      </View>

      {additionalCharge ? (
        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.colors.textMuted }]}>Additional Charges</Text>
          <Text style={[styles.value, { color: theme.colors.text }]}>{fmt(additionalCharge)}</Text>
        </View>
      ) : null}

      {discount ? (
        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.colors.success }]}>Discount</Text>
          <Text style={[styles.value, { color: theme.colors.success }]}>-{fmt(discount)}</Text>
        </View>
      ) : null}

      {subtotal !== undefined ? (
        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.colors.textMuted }]}>Subtotal</Text>
          <Text style={[styles.value, { color: theme.colors.text }]}>{fmt(subtotal)}</Text>
        </View>
      ) : null}

      {gstAmount !== undefined && gstAmount > 0 ? (
        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.colors.textMuted }]}>
            GST{gstPercent ? ` (${gstPercent}%)` : ""}
          </Text>
          <Text style={[styles.value, { color: theme.colors.text }]}>{fmt(gstAmount)}</Text>
        </View>
      ) : null}

      {warrantyPartsValue !== undefined && warrantyPartsValue !== null && warrantyPartsValue > 0 ? (
        <View style={[styles.warrantySavingsBox, { backgroundColor: `${theme.colors.primary}08`, borderColor: `${theme.colors.primary}20` }]}>
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.colors.primary, fontWeight: "700" }]}>Warranty Savings</Text>
            <Text style={[styles.value, { color: theme.colors.primary, fontWeight: "800" }]}>{fmt(warrantyPartsValue)}</Text>
          </View>
          <Text style={[styles.warrantySavingsNote, { color: theme.colors.textMuted }]}>
            Value of parts covered under warranty — informational only, not included in Grand Total.
          </Text>
        </View>
      ) : null}

      <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

      <View style={styles.row}>
        <Text style={[styles.grandLabel, { color: theme.colors.text }]}>Grand Total</Text>
        <Text style={[styles.grandValue, { color: theme.colors.primary }]}>{fmt(grandTotal)}</Text>
      </View>

      {onViewInvoice ? (
        <AppButton
          title="View Full Invoice"
          variant="outline"
          onPress={onViewInvoice}
          icon={<Receipt size={16} color={theme.colors.primary} />}
          style={{ marginTop: 14 }}
        />
      ) : null}
    </AppCard>
  );
};

const styles = StyleSheet.create({
  card: { padding: 16 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  title: { fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  amcTag: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8 },
  amcTagText: { fontSize: 10, fontWeight: "700" },
  metaBox: { borderBottomWidth: 1, paddingBottom: 6, marginBottom: 6 },
  metaLabel: { fontSize: 12 },
  metaValue: { fontSize: 12, fontWeight: "600" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 7 },
  label: { fontSize: 13 },
  value: { fontSize: 13, fontWeight: "700" },
  waivedTag: { fontSize: 10, fontWeight: "700", marginTop: 2 },
  warrantySavingsBox: { borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 6, marginBottom: 4 },
  warrantySavingsNote: { fontSize: 10, lineHeight: 14, marginTop: 2 },
  divider: { height: 1, marginVertical: 8 },
  grandLabel: { fontSize: 14, fontWeight: "800" },
  grandValue: { fontSize: 19, fontWeight: "900" },
});

export default PaymentSummaryCard;
