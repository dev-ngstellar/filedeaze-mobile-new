import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Plus, Ticket, ClipboardCheck, FileText, ArrowRight, LogOut, User } from "lucide-react-native";
import { Image } from "react-native";
import { useTheme } from "../../theme";
import { useCustomerDashboard } from "../../hooks/useCustomer";
import { CustomerStackParamList } from "../../types/navigation.types";
import { AppHeader } from "../../components/AppHeader";
import { AppLoader } from "../../components/AppLoader";
import { AppCard } from "../../components/AppCard";
import { AppBadge } from "../../components/AppBadge";
import { useAuthStore } from "../../store/auth.store";

type NavigationProp = NativeStackNavigationProp<CustomerStackParamList, "CustomerDashboard">;

export const CustomerDashboardScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { user, logout } = useAuthStore();
  const { data: dashboard, isLoading, refetch, isFetching } = useCustomerDashboard();

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <AppHeader title="Customer Portal" showBack={false} />
        <AppLoader message="Loading dashboard..." />
      </View>
    );
  }

  const openTickets = dashboard?.openTickets ?? 0;
  const completedTickets = dashboard?.completedTickets ?? 0;
  const recentInvoice = dashboard?.recentInvoice;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title="FieldEaze"
        showBack={false}
        showTenantBranding
        rightAction={
          <Pressable onPress={logout} style={({ pressed }) => [styles.logoutButton, pressed && { opacity: 0.7 }]}>
            <LogOut color={theme.colors.danger} size={20} />
          </Pressable>
        }
      />

      {/* Welcome Banner */}
      <View style={[styles.profileBanner, { backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight }]}>
        <View style={[styles.avatarCircle, { backgroundColor: `${theme.colors.primary}15`, overflow: 'hidden' }]}>
          {user?.avatar ? (
            <Image source={{ uri: user.avatar }} style={{ width: '100%', height: '100%' }} />
          ) : (
            <User color={theme.colors.primary} size={24} />
          )}
        </View>
        <View style={styles.profileText}>
          <Text style={{ color: theme.colors.textMuted, fontSize: theme.typography.fontSize.xs, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Welcome back
          </Text>
          <Text style={{ color: theme.colors.text, fontSize: theme.typography.fontSize.md, fontWeight: theme.typography.fontWeight.semibold }}>
            {user?.name || "Customer"}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={theme.colors.primary} />}
      >
        <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>
          Overview
        </Text>

        {/* 2-Column KPI Cards */}
        <View style={styles.kpiContainer}>
          <Pressable
            style={styles.kpiWrapper}
            onPress={() => navigation.navigate("TicketHistory")}
          >
            <AppCard style={styles.kpiCard}>
              <View style={[styles.iconWrapper, { backgroundColor: `${theme.colors.primary}10` }]}>
                <Ticket color={theme.colors.primary} size={20} />
              </View>
              <Text style={[styles.kpiValue, { color: theme.colors.text }]}>
                {openTickets}
              </Text>
              <View style={styles.labelRow}>
                <Text style={[styles.kpiLabel, { color: theme.colors.textMuted }]}>Open Tickets</Text>
                <Text style={{ color: theme.colors.danger, fontWeight: "bold" }}> *</Text>
              </View>
            </AppCard>
          </Pressable>

          <Pressable
            style={styles.kpiWrapper}
            onPress={() => navigation.navigate("TicketHistory")}
          >
            <AppCard style={styles.kpiCard}>
              <View style={[styles.iconWrapper, { backgroundColor: `${theme.colors.success}10` }]}>
                <ClipboardCheck color={theme.colors.success} size={20} />
              </View>
              <Text style={[styles.kpiValue, { color: theme.colors.text }]}>
                {completedTickets}
              </Text>
              <View style={styles.labelRow}>
                <Text style={[styles.kpiLabel, { color: theme.colors.textMuted }]}>Completed Tickets</Text>
                <Text style={{ color: theme.colors.danger, fontWeight: "bold" }}> *</Text>
              </View>
            </AppCard>
          </Pressable>
        </View>

        {/* Recent Invoice Card */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>
            Recent Invoice
          </Text>
          <Text style={{ color: theme.colors.danger, fontWeight: "bold" }}> *</Text>
        </View>

        {recentInvoice ? (
          <AppCard
            onPress={() => navigation.navigate("InvoiceDetails", { invoiceId: recentInvoice.id })}
            style={styles.invoiceCard}
          >
            <View style={styles.invoiceHeader}>
              <View style={styles.invoiceMeta}>
                <FileText size={18} color={theme.colors.textMuted} />
                <Text style={[styles.invoiceNo, { color: theme.colors.text }]}>
                  {recentInvoice.invoiceNumber}
                </Text>
              </View>
              <AppBadge label="View PDF" variant="primary" />
            </View>

            <View style={styles.invoiceDetails}>
              <Text style={[styles.invoiceService, { color: theme.colors.text }]}>
                {recentInvoice.ticket.subCategory.name}
              </Text>
              <Text style={{ color: theme.colors.textMuted, fontSize: 13, marginTop: 4 }}>
                Ticket Ref: {recentInvoice.ticket.ticketNumber}
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

            <View style={styles.invoiceFooter}>
              <Text style={{ fontSize: 13, color: theme.colors.textMuted }}>Total Amount</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: theme.colors.primary }}>
                  ₹{recentInvoice.total}
                </Text>
                <ArrowRight size={16} color={theme.colors.primary} />
              </View>
            </View>
          </AppCard>
        ) : (
          <AppCard style={styles.emptyCard}>
            <Text style={{ color: theme.colors.textMuted, textAlign: "center", fontSize: 13 }}>
              No recent invoices found.
            </Text>
          </AppCard>
        )}

        {/* Shortcuts / Navigation */}
        <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>
          Quick Links
        </Text>
        <View style={styles.quickLinks}>
          <Pressable
            style={[styles.quickLinkItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.borderLight }]}
            onPress={() => navigation.navigate("TicketHistory")}
          >
            <Text style={[styles.quickLinkText, { color: theme.colors.text }]}>Ticket History</Text>
            <ArrowRight size={16} color={theme.colors.textMuted} />
          </Pressable>
          <Pressable
            style={[styles.quickLinkItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.borderLight }]}
            onPress={() => navigation.navigate("PaymentHistory")}
          >
            <Text style={[styles.quickLinkText, { color: theme.colors.text }]}>Payment History</Text>
            <ArrowRight size={16} color={theme.colors.textMuted} />
          </Pressable>
          <Pressable
            style={[styles.quickLinkItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.borderLight }]}
            onPress={() => navigation.navigate("InvoiceList")}
          >
            <Text style={[styles.quickLinkText, { color: theme.colors.text }]}>Invoices</Text>
            <ArrowRight size={16} color={theme.colors.textMuted} />
          </Pressable>
          <Pressable
            style={[styles.quickLinkItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.borderLight }]}
            onPress={() => navigation.navigate("AddressBook")}
          >
            <Text style={[styles.quickLinkText, { color: theme.colors.text }]}>Address Book</Text>
            <ArrowRight size={16} color={theme.colors.textMuted} />
          </Pressable>
        </View>
      </ScrollView>

      {/* Floating Action Button (FAB) */}
      <Pressable
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate("RaiseTicket")}
      >
        <Plus color="#ffffff" size={24} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  logoutButton: {
    padding: 8,
  },
  profileBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  profileText: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginVertical: 12,
  },
  kpiContainer: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 8,
  },
  kpiWrapper: {
    flex: 1,
  },
  kpiCard: {
    padding: 16,
    alignItems: "flex-start",
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  invoiceCard: {
    marginBottom: 16,
  },
  invoiceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  invoiceMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  invoiceNo: {
    fontSize: 14,
    fontWeight: "700",
  },
  invoiceDetails: {
    marginBottom: 12,
  },
  invoiceService: {
    fontSize: 15,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  invoiceFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  emptyCard: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  quickLinks: {
    gap: 8,
  },
  quickLinkItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  quickLinkText: {
    fontSize: 14,
    fontWeight: "600",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
