import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Calendar, CreditCard, ChevronRight, Inbox } from "lucide-react-native";
import { useTheme } from "../../theme";
import { useCustomerPayments, useCustomerInvoices } from "../../hooks/useCustomer";
import { CustomerStackParamList } from "../../types/navigation.types";
import { AppHeader } from "../../components/AppHeader";
import { AppLoader } from "../../components/AppLoader";
import { AppCard } from "../../components/AppCard";
import { AppBadge } from "../../components/AppBadge";

type NavigationProp = NativeStackNavigationProp<CustomerStackParamList, "PaymentHistory">;

export const PaymentHistoryScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const { data: payments = [], isLoading, refetch, isFetching } = useCustomerPayments();
  const { data: invoices = [] } = useCustomerInvoices();

  const pendingCredits = React.useMemo(() => {
    return (payments || []).filter((p) => p.method === "CREDIT" && p.status === "PENDING");
  }, [payments]);

  const outstandingTotal = React.useMemo(() => {
    return pendingCredits.reduce((sum, p) => {
      const amt = p.invoice?.total != null ? Number(p.invoice.total) : Number(p.amount || 0);
      return sum + (isNaN(amt) ? 0 : amt);
    }, 0);
  }, [pendingCredits]);

  const getStatusVariant = (status: string) => {
    const s = (status || "").toUpperCase();
    if (s === "PAID" || s === "COMPLETED" || s === "SUCCESS" || s === "COLLECTED" || s === "VERIFIED") return "success";
    if (s === "PENDING" || s === "PROCESSING") return "warning";
    if (s === "REFUNDED") return "info" as any;
    return "danger";
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader showBack onBackPress={() => navigation.goBack()} title="Payment History" />

      {isLoading ? (
        <AppLoader message="Retrieving transactions..." />
      ) : (
        <FlatList
          data={payments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={theme.colors.primary} />}
          ListHeaderComponent={
            <Pressable
              onPress={() => navigation.navigate("CustomerCredit")}
              style={({ pressed }) => [
                styles.creditLinkCard,
                {
                  backgroundColor: `${theme.colors.warning}14`,
                  borderColor: `${theme.colors.warning}40`,
                },
                pressed && { opacity: 0.75 },
              ]}
            >
              <View style={[styles.creditIconWrap, { backgroundColor: theme.colors.warning }]}>
                <CreditCard size={18} color="#ffffff" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={[styles.creditLinkTitle, { color: theme.colors.text }]}>
                    Outstanding Credit
                  </Text>
                  {pendingCredits.length > 0 && (
                    <AppBadge label={`${pendingCredits.length} Pending`} variant="warning" />
                  )}
                </View>
                {pendingCredits.length > 0 ? (
                  <Text style={{ fontSize: 16, fontWeight: "800", color: theme.colors.warning, marginTop: 2 }}>
                    ₹{outstandingTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                ) : (
                  <Text style={[styles.creditLinkSub, { color: theme.colors.textMuted }]}>
                    No outstanding credit balance
                  </Text>
                )}
                <Text style={[styles.creditLinkSub, { color: theme.colors.textMuted, marginTop: 2 }]}>
                  {pendingCredits.length > 0
                    ? `${pendingCredits.length} ${pendingCredits.length === 1 ? "payment pending" : "payments pending"} • Tap to view`
                    : "View all credit & pay later balances"}
                </Text>
              </View>
              <ChevronRight size={18} color={theme.colors.warning} />
            </Pressable>
          }
          renderItem={({ item }) => {
            const matchingInvoice = invoices.find(inv => inv.invoiceNumber === item.invoice?.invoiceNumber);
            const actualAmount = Number(
              item.invoice?.total != null
                ? item.invoice.total
                : matchingInvoice?.total != null
                ? matchingInvoice.total
                : item.amount ?? 0
            );
            const formattedAmount = actualAmount.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
            const ticketNumber =
              matchingInvoice?.ticket?.ticketNumber ||
              item.ticket?.ticketNumber ||
              item.invoice?.invoiceNumber ||
              "—";
            const targetInvoiceId = matchingInvoice?.id || item.invoice?.id || item.id;
            const displayStatus = item.status === "COLLECTED" ? "PAID" : item.status;

            return (
              <AppCard
                style={styles.paymentCard}
                onPress={() => {
                  if (targetInvoiceId) {
                    navigation.navigate("InvoiceDetails", { invoiceId: targetInvoiceId });
                  }
                }}
              >
                <View style={styles.cardHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={[styles.label, { color: theme.colors.textMuted }]}>Payment ID</Text>
                    <Text style={{ color: theme.colors.danger, fontWeight: "bold" }}> *</Text>
                    <Text style={[styles.valueId, { color: theme.colors.text }]}>: {item.id.substring(0, 8).toUpperCase()}</Text>
                  </View>
                  <AppBadge label={displayStatus} variant={getStatusVariant(item.status)} />
                </View>

                <View style={styles.detailRow}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={[styles.label, { color: theme.colors.textMuted }]}>Ticket Number</Text>
                    <Text style={{ color: theme.colors.danger, fontWeight: "bold" }}> *</Text>
                    <Text style={[styles.value, { color: theme.colors.text }]}>: {ticketNumber}</Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={[styles.label, { color: theme.colors.textMuted }]}>Amount</Text>
                    <Text style={{ color: theme.colors.danger, fontWeight: "bold" }}> *</Text>
                    <Text style={[styles.valueAmount, { color: theme.colors.primary }]}>: ₹{formattedAmount}</Text>
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

                <View style={styles.cardFooter}>
                  <View style={styles.timeInfo}>
                    <Calendar size={14} color={theme.colors.textMuted} style={{ marginRight: 4 }} />
                    <Text style={{ fontSize: 10, color: theme.colors.textMuted }}>Date</Text>
                    <Text style={{ color: theme.colors.danger, fontWeight: "bold" }}> *</Text>
                    <Text style={{ fontSize: 12, color: theme.colors.text, fontWeight: "600" }}>
                      : {formatDate(item.createdAt)}
                    </Text>
                  </View>
                  {item.invoice?.invoiceNumber ? (
                    <View style={styles.actionLink}>
                      <Text style={{ fontSize: 12, color: theme.colors.primary, fontWeight: "700" }}>Invoice</Text>
                      <ChevronRight size={14} color={theme.colors.primary} />
                    </View>
                  ) : null}
                </View>
              </AppCard>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <CreditCard size={48} color={theme.colors.textLight} />
              <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                No transaction records found.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  paymentCard: {
    marginBottom: 12,
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
  },
  valueId: {
    fontSize: 13,
    fontWeight: "700",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  value: {
    fontSize: 13,
    fontWeight: "600",
  },
  valueAmount: {
    fontSize: 15,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timeInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  emptyContainer: {
    paddingVertical: 80,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
  },
  creditLinkCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 16,
    gap: 12,
  },
  creditIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  creditLinkTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  creditLinkSub: {
    fontSize: 12,
  },
});
