import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Receipt } from "lucide-react-native";
import { useTheme } from "../theme";
import { AppCard } from "./AppCard";
import { AppButton } from "./AppButton";

export interface PaymentBreakdownProps {
  invoiceNo?: string;
  ticketNo?: string;
  customerName?: string;
  baseAmount: number;
  extraCharges?: number;
  platformFee?: number;
  shippingCharge?: number;
  handlingCharge?: number;
  gstEnabled?: boolean;
  gstPercent?: number;
  gstAmount?: number;
  discountAmount?: number;
  totalAmount: number;
  collectedAmount?: number;
  paymentMode?: string;
  paymentStatus?: string;
  invoiceDate?: string;
  currency?: string;
  onViewInvoice?: () => void;
}

export const PaymentBreakdownCard: React.FC<PaymentBreakdownProps> = ({
  invoiceNo,
  ticketNo,
  customerName,
  baseAmount,
  extraCharges = 0,
  platformFee = 0,
  shippingCharge = 0,
  handlingCharge = 0,
  gstEnabled = false,
  gstPercent = 0,
  gstAmount = 0,
  discountAmount = 0,
  totalAmount,
  collectedAmount,
  paymentMode,
  paymentStatus,
  invoiceDate,
  currency = "₹",
  onViewInvoice,
}) => {
  const theme = useTheme();

  return (
    <AppCard style={styles.card}>
      <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>
        Invoice Summary
      </Text>

      <View style={styles.detailsContainer}>
        {invoiceNo && (
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.colors.textMuted }]}>Invoice No</Text>
            <Text style={[styles.value, { color: theme.colors.text }]}>#{invoiceNo}</Text>
          </View>
        )}
        {ticketNo && (
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.colors.textMuted }]}>Ticket No</Text>
            <Text style={[styles.value, { color: theme.colors.text }]}>{ticketNo}</Text>
          </View>
        )}
        {customerName && (
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.colors.textMuted }]}>Customer</Text>
            <Text style={[styles.value, { color: theme.colors.text }]}>{customerName}</Text>
          </View>
        )}

        <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.colors.textMuted }]}>Service Amount</Text>
          <Text style={[styles.value, { color: theme.colors.text }]}>
            {currency}
            {baseAmount.toLocaleString("en-IN")}
          </Text>
        </View>

        {extraCharges > 0 && (
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.colors.textMuted }]}>Spares / Extra Charges</Text>
            <Text style={[styles.value, { color: theme.colors.text }]}>
              {currency}
              {extraCharges.toLocaleString("en-IN")}
            </Text>
          </View>
        )}

        {platformFee > 0 && (
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.colors.textMuted }]}>Platform Fee</Text>
            <Text style={[styles.value, { color: theme.colors.text }]}>
              {currency}
              {platformFee.toLocaleString("en-IN")}
            </Text>
          </View>
        )}

        {shippingCharge > 0 && (
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.colors.textMuted }]}>Shipping Charge</Text>
            <Text style={[styles.value, { color: theme.colors.text }]}>
              {currency}
              {shippingCharge.toLocaleString("en-IN")}
            </Text>
          </View>
        )}

        {handlingCharge > 0 && (
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.colors.textMuted }]}>Handling Charge</Text>
            <Text style={[styles.value, { color: theme.colors.text }]}>
              {currency}
              {handlingCharge.toLocaleString("en-IN")}
            </Text>
          </View>
        )}

        {discountAmount > 0 && (
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.colors.success }]}>Discount</Text>
            <Text style={[styles.value, { color: theme.colors.success }]}>
              -{currency}
              {discountAmount.toLocaleString("en-IN")}
            </Text>
          </View>
        )}

        {gstEnabled && gstPercent > 0 && (
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.colors.textMuted }]}>GST ({gstPercent}%)</Text>
            <Text style={[styles.value, { color: theme.colors.text }]}>
              {currency}
              {gstAmount.toLocaleString("en-IN")}
            </Text>
          </View>
        )}

        <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

        <View style={styles.row}>
          <Text style={[styles.totalLabel, { color: theme.colors.text }]}>Total Amount</Text>
          <Text style={[styles.totalValue, { color: theme.colors.primary }]}>
            {currency}
            {totalAmount.toLocaleString("en-IN")}
          </Text>
        </View>

        {collectedAmount !== undefined && collectedAmount !== totalAmount && (
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.colors.textMuted }]}>Collected Amount</Text>
            <Text style={[styles.value, { color: theme.colors.text }]}>
              {currency}
              {collectedAmount.toLocaleString("en-IN")}
            </Text>
          </View>
        )}

        <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

        {paymentMode && (
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.colors.textMuted }]}>Payment Mode</Text>
            <Text style={[styles.value, { color: theme.colors.text }]}>{paymentMode}</Text>
          </View>
        )}
        
        {paymentStatus && (
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.colors.textMuted }]}>Payment Status</Text>
            <Text
              style={[
                styles.value,
                { color: paymentStatus.toUpperCase() === "COLLECTED" || paymentStatus.toUpperCase() === "PAID" ? theme.colors.success : theme.colors.warning },
              ]}
            >
              {paymentStatus}
            </Text>
          </View>
        )}

        {invoiceDate && (
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.colors.textMuted }]}>Invoice Date</Text>
            <Text style={[styles.value, { color: theme.colors.text }]}>{invoiceDate}</Text>
          </View>
        )}
      </View>

      {onViewInvoice && (
        <AppButton
          title="View Full Invoice Details"
          variant="outline"
          onPress={onViewInvoice}
          icon={<Receipt size={16} color={theme.colors.primary} />}
          style={styles.actionBtn}
        />
      )}
    </AppCard>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  detailsContainer: {
    gap: 8,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 12,
  },
  value: {
    fontSize: 12,
    fontWeight: "600",
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  totalValue: {
    fontSize: 14,
    fontWeight: "800",
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  actionBtn: {
    marginTop: 16,
  },
});
