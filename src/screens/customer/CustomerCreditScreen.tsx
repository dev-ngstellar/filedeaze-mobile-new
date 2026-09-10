import React, { useMemo } from "react";
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
import {
  CreditCard,
  Calendar,
  ChevronRight,
  AlertCircle,
  FileText,
  Inbox,
  Info,
} from "lucide-react-native";
import { useTheme } from "../../theme";
import { useCustomerPayments, useCustomerTickets, useCustomerInvoices } from "../../hooks/useCustomer";
import { CustomerPayment } from "../../services/customer.service";
import { CustomerStackParamList } from "../../types/navigation.types";
import { AppHeader } from "../../components/AppHeader";
import { AppLoader } from "../../components/AppLoader";
import { AppCard } from "../../components/AppCard";
import { AppBadge } from "../../components/AppBadge";
import { AppButton } from "../../components/AppButton";

type NavigationProp = NativeStackNavigationProp<CustomerStackParamList, "CustomerCredit">;

interface CreditItem {
  id: string;
  ticketId: string;
  ticketNumber: string;
  serviceName: string;
  categoryName: string;
  serviceDate: string;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: string;
  invoiceNumber?: string;
}

export const CustomerCreditScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const {
    data: payments = [],
    isLoading,
    isError,
    refetch: refetchPayments,
    isFetching,
  } = useCustomerPayments();

  const { data: tickets = [], refetch: refetchTickets } = useCustomerTickets();
  const { data: invoices = [], refetch: refetchInvoices, isFetching: isFetchingInvoices } = useCustomerInvoices();

  const refetch = async () => {
    await Promise.all([refetchPayments(), refetchTickets(), refetchInvoices()]);
  };

  // Map ticketId to real human-readable ticket number (e.g. TKT-2026-00048)
  const ticketMap = useMemo(() => {
    const map = new Map<string, string>();
    if (Array.isArray(tickets)) {
      tickets.forEach((t: any) => {
        if (t.id && t.ticketNumber) {
          map.set(t.id, t.ticketNumber);
        }
      });
    }
    return map;
  }, [tickets]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
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

  // Filter strictly for Pay Later / Credit records: method === "CREDIT" AND status === "PENDING"
  const creditItems: CreditItem[] = useMemo(() => {
    const items: CreditItem[] = [];
    const processedTicketIds = new Set<string>();

    if (Array.isArray(payments)) {
      payments
        .filter(
          (p: CustomerPayment) =>
            p.method === "CREDIT" && p.status === "PENDING"
        )
        .forEach((p: CustomerPayment) => {
          const ticketId = p.ticketId || p.ticket?.id || p.id;
          if (ticketId) processedTicketIds.add(String(ticketId));

          const matchInv = (invoices || []).find(
            (inv: any) =>
              (p.invoiceId && inv.id === p.invoiceId) ||
              (ticketId && inv.ticketId === ticketId) ||
              (p.invoice?.invoiceNumber && inv.invoiceNumber === p.invoice.invoiceNumber) ||
              (p.invoice?.id && inv.id === p.invoice.id) ||
              (p.ticket?.ticketNumber && inv.ticket?.ticketNumber === p.ticket.ticketNumber)
          );

          const matchTicket = (tickets || []).find(
            (t: any) =>
              (ticketId && t.id === ticketId) ||
              (p.ticket?.ticketNumber && t.ticketNumber === p.ticket.ticketNumber)
          );

          const total =
            matchInv?.total != null && !isNaN(Number(matchInv.total)) && Number(matchInv.total) > 0
              ? Number(matchInv.total)
              : matchTicket?.invoice?.total != null && !isNaN(Number(matchTicket.invoice.total)) && Number(matchTicket.invoice.total) > 0
              ? Number(matchTicket.invoice.total)
              : matchTicket?.paidAmount != null && !isNaN(Number(matchTicket.paidAmount)) && Number(matchTicket.paidAmount) > 0
              ? Number(matchTicket.paidAmount)
              : p.invoice?.total != null && !isNaN(Number(p.invoice.total)) && Number(p.invoice.total) > 0
              ? Number(p.invoice.total)
              : matchTicket?.payment?.amount != null && !isNaN(Number(matchTicket.payment.amount)) && Number(matchTicket.payment.amount) > 0
              ? Number(matchTicket.payment.amount)
              : Number(p.amount || 0);

          const paid = 0; // PENDING credit has not been collected yet
          const outstanding = total;

          const ticketNum =
            ticketMap.get(String(ticketId)) ||
            matchTicket?.ticketNumber ||
            matchInv?.ticket?.ticketNumber ||
            p.ticket?.ticketNumber ||
            (ticketId ? `TKT-${String(ticketId).substring(0, 8).toUpperCase()}` : "Ticket");

          const service =
            matchTicket?.subCategory?.name ||
            matchInv?.ticket?.subCategory?.name ||
            p.ticket?.subCategory?.name ||
            matchTicket?.description ||
            p.ticket?.description ||
            "Service";

          const category =
            matchTicket?.subCategory?.category?.name ||
            matchInv?.ticket?.subCategory?.category?.name ||
            p.ticket?.subCategory?.category?.name ||
            "";

          items.push({
            id: p.id,
            ticketId: String(ticketId),
            ticketNumber: ticketNum,
            serviceName: service,
            categoryName: category,
            serviceDate: p.createdAt || new Date().toISOString(),
            totalAmount: total,
            paidAmount: paid,
            outstandingAmount: outstanding,
            status: "Pending",
            invoiceNumber: matchInv?.invoiceNumber || p.invoice?.invoiceNumber,
          });
        });
    }

    // Also check tickets for any credit pending tickets not yet in payments list
    (tickets || []).forEach((t: any) => {
      const ticketId = String(t.id);
      if (processedTicketIds.has(ticketId)) return;

      const pMethod = t.payment?.method;
      const pStatus = t.payment?.status;
      if (pMethod === "CREDIT" && pStatus === "PENDING") {
        processedTicketIds.add(ticketId);

        const matchInv = (invoices || []).find(
          (inv: any) =>
            inv.ticketId === ticketId ||
            (t.ticketNumber && inv.ticket?.ticketNumber === t.ticketNumber)
        );

        const total =
          matchInv?.total != null && !isNaN(Number(matchInv.total)) && Number(matchInv.total) > 0
            ? Number(matchInv.total)
            : t.invoice?.total != null && !isNaN(Number(t.invoice.total)) && Number(t.invoice.total) > 0
            ? Number(t.invoice.total)
            : t.paidAmount != null && !isNaN(Number(t.paidAmount)) && Number(t.paidAmount) > 0
            ? Number(t.paidAmount)
            : Number(t.payment?.amount || 0);

        items.push({
          id: t.payment?.id || t.id,
          ticketId,
          ticketNumber: t.ticketNumber || `TKT-${ticketId.substring(0, 8).toUpperCase()}`,
          serviceName: t.subCategory?.name || t.description || "Service",
          categoryName: t.subCategory?.category?.name || "",
          serviceDate: t.createdAt || new Date().toISOString(),
          totalAmount: total,
          paidAmount: 0,
          outstandingAmount: total,
          status: "Pending",
          invoiceNumber: matchInv?.invoiceNumber || t.invoice?.invoiceNumber,
        });
      }
    });

    return items;
  }, [payments, tickets, invoices, ticketMap]);

  const totalOutstanding = useMemo(() => {
    return creditItems.reduce((sum, item) => sum + item.outstandingAmount, 0);
  }, [creditItems]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        showBack
        onBackPress={() => navigation.goBack()}
        title="Credit / Pay Later"
        subtitle="Outstanding payments"
      />

      {isLoading && !isFetching ? (
        <AppLoader message="Loading outstanding payments..." />
      ) : isError ? (
        <View style={styles.centerContainer}>
          <View style={[styles.iconWrap, { backgroundColor: `${theme.colors.danger}12` }]}>
            <AlertCircle size={36} color={theme.colors.danger} />
          </View>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Unable to load credit details.
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
            Please check your connection and try again.
          </Text>
          <AppButton
            title="Retry"
            onPress={() => refetch()}
            variant="primary"
            style={{ marginTop: 16, minWidth: 120 }}
          />
        </View>
      ) : creditItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconWrap, { backgroundColor: `${theme.colors.primary}10` }]}>
            <Inbox size={42} color={theme.colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
            No Outstanding Payments
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.colors.textMuted }]}>
            You don't have any pending Credit / Pay Later payments.
          </Text>
        </View>
      ) : (
        <FlatList
          data={creditItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={refetch}
              tintColor={theme.colors.primary}
            />
          }
          ListHeaderComponent={
            <View style={styles.headerContainer}>
              {/* Prominent Summary Card */}
              <View
                style={[
                  styles.summaryCard,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: `${theme.colors.warning}40`,
                  },
                ]}
              >
                <View style={styles.summaryTopRow}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={[styles.summaryIconWrap, { backgroundColor: `${theme.colors.warning}18` }]}>
                      <CreditCard size={18} color={theme.colors.warning} />
                    </View>
                    <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>
                      {creditItems.length === 1 ? "Outstanding Amount" : "Total Outstanding"}
                    </Text>
                  </View>
                  <AppBadge label="Pending" variant="warning" />
                </View>

                <View style={styles.summaryAmountRow}>
                  <Text style={[styles.summaryAmount, { color: theme.colors.warning }]}>
                    ₹{totalOutstanding.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </Text>
                  <Text style={[styles.summaryCountText, { color: theme.colors.textMuted }]}>
                    {creditItems.length} {creditItems.length === 1 ? "payment pending" : "payments pending"}
                  </Text>
                </View>

                {/* Informational Section */}
                <View style={[styles.infoBanner, { backgroundColor: `${theme.colors.warning}10`, borderColor: `${theme.colors.warning}25` }]}>
                  <Info size={16} color={theme.colors.warning} style={{ marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.infoBannerTitle, { color: theme.colors.text }]}>
                      Payment pending
                    </Text>
                    <Text style={[styles.infoBannerSubtext, { color: theme.colors.textMuted }]}>
                      This amount will be collected by the assigned technician or admin.
                    </Text>
                  </View>
                </View>
              </View>

              {/* Section Header */}
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>
                  Pending Credit Tickets ({creditItems.length})
                </Text>
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                if (item.ticketId) {
                  navigation.navigate("CustomerTicketDetails", { ticketId: item.ticketId });
                }
              }}
              style={({ pressed }) => [
                styles.creditCardWrap,
                pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
              ]}
            >
              <AppCard style={styles.creditCard}>
                {/* Header: Ticket Number & Status Badge */}
                <View style={styles.cardTopRow}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
                    <FileText size={15} color={theme.colors.primary} />
                    <Text style={[styles.ticketNumberText, { color: theme.colors.text }]} numberOfLines={1}>
                      Ticket #{item.ticketNumber}
                    </Text>
                  </View>
                  <AppBadge label="Pending" variant="warning" />
                </View>

                {/* Service Name & Invoice */}
                <View style={styles.serviceSection}>
                  <Text style={[styles.serviceName, { color: theme.colors.text }]}>
                    {item.serviceName}
                  </Text>
                  {item.invoiceNumber ? (
                    <Text style={[styles.invoiceNumberText, { color: theme.colors.textMuted }]}>
                      Invoice: #{item.invoiceNumber}
                    </Text>
                  ) : null}
                  <View style={styles.dateRow}>
                    <Calendar size={13} color={theme.colors.textMuted} style={{ marginRight: 4 }} />
                    <Text style={[styles.dateText, { color: theme.colors.textMuted }]}>
                      Date: {formatDate(item.serviceDate)}
                    </Text>
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

                {/* Amount Row */}
                <View style={styles.amountRow}>
                  <View>
                    <Text style={[styles.amountLabel, { color: theme.colors.textMuted }]}>
                      Outstanding
                    </Text>
                    <Text style={[styles.amountVal, { color: theme.colors.warning }]}>
                      ₹{item.outstandingAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </Text>
                  </View>

                  {/* Tappable View Ticket Affordance */}
                  <View style={styles.viewAffordance}>
                    <Text style={[styles.viewAffordanceText, { color: theme.colors.primary }]}>
                      View Ticket
                    </Text>
                    <ChevronRight size={14} color={theme.colors.primary} />
                  </View>
                </View>
              </AppCard>
            </Pressable>
          )}
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
  headerContainer: {
    marginBottom: 8,
  },
  summaryCard: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    marginBottom: 16,
    shadowColor: "rgba(15,23,42,0.06)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 3,
  },
  summaryTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  summaryAmountRow: {
    marginBottom: 14,
  },
  summaryAmount: {
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  summaryCountText: {
    fontSize: 13,
    marginTop: 4,
    fontWeight: "500",
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  infoBannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  infoBannerSubtext: {
    fontSize: 12,
    lineHeight: 16,
  },
  sectionHeaderRow: {
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  creditCardWrap: {
    marginBottom: 12,
  },
  creditCard: {
    padding: 16,
    borderRadius: 16,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  ticketNumberText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  serviceSection: {
    marginBottom: 10,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  invoiceNumberText: {
    fontSize: 12,
    marginBottom: 4,
    fontWeight: "500",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateText: {
    fontSize: 12,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  amountLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  amountVal: {
    fontSize: 18,
    fontWeight: "800",
  },
  viewAffordance: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  viewAffordanceText: {
    fontSize: 13,
    fontWeight: "700",
  },
  centerContainer: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  emptyContainer: {
    flex: 1,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 80,
  },
  emptyIconWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    maxWidth: 260,
  },
});

export default CustomerCreditScreen;
