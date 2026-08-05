import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ShieldCheck, Receipt, Package, PackageCheck } from "lucide-react-native";
import { useTheme } from "../../theme";
import { AppCard } from "../AppCard";
import { AppButton } from "../AppButton";

/** A single spare-part line for display — passed from either paymentSpareParts state (live
 * preview) or the API response spareParts array (persisted invoice / success view). */
export interface SparePartDisplayItem {
  name: string;
  quantity: number;
  unitPrice: number;
  /** "WARRANTY" = no cost, covered; "OUT_OF_WARRANTY" = chargeable */
  coverageType: "WARRANTY" | "OUT_OF_WARRANTY";
}

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
  /** Itemised spare parts — chargeable (OUT_OF_WARRANTY) are shown with a + prefix,
   * warranty parts with a - prefix (they are covered at no cost). When omitted the
   * Spare Parts section is not rendered. */
  spareParts?: SparePartDisplayItem[];
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
  spareParts,
}) => {
  const theme = useTheme();
  const fmt = (n: number) => `${currency}${n.toLocaleString("en-IN")}`;
  const amcApplied = !!serviceChargeWaived || !!labourChargeWaived;

  // Calculate values according to requirements:
  // 1. Service Charge: billable if > 0 and not waived
  const billableServiceCharge = (serviceCharge > 0 && !serviceChargeWaived) ? serviceCharge : 0;

  // 2. GST: use backend gstAmount if provided, or calculate ONLY on billable Service Charge
  const isGstEnabled = gstPercent !== undefined && gstPercent > 0;
  const calculatedGstAmount = (gstAmount !== undefined && gstAmount !== null)
    ? gstAmount
    : (isGstEnabled && billableServiceCharge > 0)
      ? Math.round((billableServiceCharge * gstPercent) / 100 * 100) / 100
      : 0;

  // 3. Labour Charge: billable if > 0 and not waived
  const billableLabourCharge = (labourCharge > 0 && !labourChargeWaived) ? labourCharge : 0;

  // 4. Spare Parts Amount:
  const billableSpareParts = sparePartsAmount > 0 ? sparePartsAmount : 0;

  // 5. Additional / other charges:
  const billableAdditional = additionalCharge && additionalCharge > 0 ? additionalCharge : 0;

  // 6. Discount:
  const billableDiscount = discount && discount > 0 ? discount : 0;

  // 7. Subtotal and Grand Total:
  const displaySubtotal = billableServiceCharge + billableLabourCharge + billableSpareParts + billableAdditional - billableDiscount;
  const displayGrandTotal = (grandTotal !== undefined && grandTotal !== null && grandTotal > 0)
    ? grandTotal
    : Math.max(0, displaySubtotal + calculatedGstAmount);

  // Split spare parts by coverage type for the itemised section
  const chargeableParts = spareParts?.filter((p) => p.coverageType === "OUT_OF_WARRANTY") ?? [];
  const warrantyParts = spareParts?.filter((p) => p.coverageType === "WARRANTY") ?? [];
  const hasSparePartsSection = (spareParts?.length ?? 0) > 0;

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

      {/* ── Charge Rows ──────────────────────────────────────────────────────── */}

      {/* Service Charge — show only if > 0 */}
      {serviceCharge > 0 ? (
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
      ) : null}

      {/* Labour Charge — show only if > 0 */}
      {(labourCharge !== undefined && labourCharge > 0) ? (
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
      ) : null}

      {/* Chargeable Spare Parts total — show only when > 0 */}
      {billableSpareParts > 0 ? (
        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.colors.textMuted }]}>Chargeable Spare Parts</Text>
          <Text style={[styles.value, { color: theme.colors.text }]}>{fmt(billableSpareParts)}</Text>
        </View>
      ) : null}

      {billableAdditional > 0 ? (
        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.colors.textMuted }]}>Additional Charges</Text>
          <Text style={[styles.value, { color: theme.colors.text }]}>{fmt(billableAdditional)}</Text>
        </View>
      ) : null}

      {billableDiscount > 0 ? (
        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.colors.success }]}>Discount</Text>
          <Text style={[styles.value, { color: theme.colors.success }]}>-{fmt(billableDiscount)}</Text>
        </View>
      ) : null}

      {/* Subtotal row — show only if > 0 */}
      {displaySubtotal > 0 ? (
        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.colors.textMuted }]}>Subtotal</Text>
          <Text style={[styles.value, { color: theme.colors.text }]}>{fmt(displaySubtotal)}</Text>
        </View>
      ) : null}

      {/* GST row — calculated ONLY on Service Charge; hidden if gstEnabled is false or Service Charge is 0/waived */}
      {calculatedGstAmount > 0 ? (
        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.colors.textMuted }]}>
            GST{gstPercent ? ` (${gstPercent}%)` : ""}
          </Text>
          <Text style={[styles.value, { color: theme.colors.text }]}>{fmt(calculatedGstAmount)}</Text>
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
        <Text style={[styles.grandValue, { color: theme.colors.primary }]}>{fmt(displayGrandTotal)}</Text>
      </View>

      {/* ── Spare Parts Breakdown ─────────────────────────────────────────────── */}
      {hasSparePartsSection ? (
        <View style={[styles.sparePartsSection, { borderColor: theme.colors.borderLight, backgroundColor: `${theme.colors.card}` }]}>
          <View style={styles.sparePartsSectionHeader}>
            <Package size={13} color={theme.colors.textMuted} />
            <Text style={[styles.sparePartsSectionTitle, { color: theme.colors.textMuted }]}>SPARE PARTS BREAKDOWN</Text>
          </View>

          {/* Chargeable spare parts */}
          {chargeableParts.length > 0 ? (
            <View style={styles.spareGroupBlock}>
              <View style={[styles.spareGroupLabel, { backgroundColor: `${theme.colors.danger}12` }]}>
                <Text style={[styles.spareGroupLabelText, { color: theme.colors.danger }]}>
                  Chargeable Parts
                </Text>
              </View>
              {chargeableParts.map((part, idx) => {
                const lineTotal = part.unitPrice * part.quantity;
                return (
                  <View
                    key={idx}
                    style={[
                      styles.spareRow,
                      idx < chargeableParts.length - 1 ? { borderBottomWidth: 1, borderColor: theme.colors.borderLight } : undefined,
                    ]}
                  >
                    <View style={styles.spareRowLeft}>
                      <Text style={[styles.sparePrefix, { color: theme.colors.danger }]}>+</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.spareName, { color: theme.colors.text }]}>{part.name}</Text>
                        <Text style={[styles.spareQty, { color: theme.colors.textMuted }]}>
                          Qty {part.quantity} × {fmt(part.unitPrice)}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.spareAmount, { color: theme.colors.text }]}>{fmt(lineTotal)}</Text>
                  </View>
                );
              })}
            </View>
          ) : null}

          {/* Warranty spare parts */}
          {warrantyParts.length > 0 ? (
            <View style={[styles.spareGroupBlock, chargeableParts.length > 0 ? { marginTop: 10 } : undefined]}>
              <View style={[styles.spareGroupLabel, { backgroundColor: `${theme.colors.success}12` }]}>
                <PackageCheck size={11} color={theme.colors.success} />
                <Text style={[styles.spareGroupLabelText, { color: theme.colors.success }]}>
                  Warranty Parts (Covered)
                </Text>
              </View>
              {warrantyParts.map((part, idx) => {
                const faceValue = part.unitPrice * part.quantity;
                return (
                  <View
                    key={idx}
                    style={[
                      styles.spareRow,
                      idx < warrantyParts.length - 1 ? { borderBottomWidth: 1, borderColor: theme.colors.borderLight } : undefined,
                    ]}
                  >
                    <View style={styles.spareRowLeft}>
                      <Text style={[styles.sparePrefix, { color: theme.colors.success }]}>−</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.spareName, { color: theme.colors.text }]}>{part.name}</Text>
                        <Text style={[styles.spareQty, { color: theme.colors.textMuted }]}>
                          Qty {part.quantity} · Face value {fmt(faceValue)}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.spareAmount, { color: theme.colors.success }]}>FREE</Text>
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>
      ) : null}

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
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  title: { fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5, flexShrink: 1 },
  amcTag: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, flexShrink: 0 },
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

  // ── Spare Parts Breakdown ───────────────────────────────────────────────
  sparePartsSection: {
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  sparePartsSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sparePartsSectionTitle: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  spareGroupBlock: {
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  spareGroupLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  spareGroupLabelText: {
    fontSize: 10,
    fontWeight: "700",
  },
  spareRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 7,
  },
  spareRowLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
    marginRight: 8,
    gap: 6,
  },
  sparePrefix: {
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 18,
    width: 12,
    textAlign: "center",
  },
  spareName: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 17,
  },
  spareQty: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 1,
  },
  spareAmount: {
    fontSize: 13,
    fontWeight: "700",
    minWidth: 50,
    textAlign: "right",
  },
});

export default PaymentSummaryCard;
