import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Shield,
  Calendar,
  AlertTriangle,
  ChevronRight,
  ClipboardList,
  Clock,
  Sparkles,
  Info,
} from "lucide-react-native";
import { useTheme } from "../../theme";
import { useMyAmcSubscriptions } from "../../hooks/useAmc";
import { CustomerStackParamList } from "../../types/navigation.types";
import { AppHeader } from "../../components/AppHeader";
import { AppLoader } from "../../components/AppLoader";
import { AppCard } from "../../components/AppCard";
import { AppBadge } from "../../components/AppBadge";
import { AmcSubscription, AmcSubscriptionStatus } from "../../services/amc.service";

type NavigationProp = NativeStackNavigationProp<CustomerStackParamList, "MyAmc">;

type FilterTab = "ALL" | "ACTIVE" | "PENDING" | "PAST";

export const MyAmcScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
  const [page, setPage] = useState(1);
  const limit = 20;

  // Derive status filters based on the selected tab
  const getStatusFilter = (): AmcSubscriptionStatus | undefined => {
    // If filtering by specific statuses on the API side, or client side. 
    // We fetch all and filter on client, or pass status parameter to API.
    // Let's pass status to API for tabs:
    if (activeTab === "ACTIVE") return "ACTIVE";
    if (activeTab === "PENDING") return "PENDING_APPROVAL";
    return undefined;
  };

  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useMyAmcSubscriptions({
    status: getStatusFilter(),
    page,
    limit,
  });

  const subscriptions = data?.data || [];

  // Filter subscriptions locally for past/cancelled records if on "PAST" tab
  const getFilteredSubscriptions = () => {
    if (activeTab === "PAST") {
      return subscriptions.filter(
        (sub) =>
          sub.status === "CANCELLED" ||
          sub.status === "REJECTED" ||
          (sub.endDate && new Date(sub.endDate) < new Date())
      );
    }
    if (activeTab === "ACTIVE") {
      return subscriptions.filter((sub) => sub.status === "ACTIVE" || sub.status === "RENEWED");
    }
    if (activeTab === "PENDING") {
      return subscriptions.filter(
        (sub) => sub.status === "PENDING_APPROVAL" || sub.status === "PAYMENT_PENDING"
      );
    }
    return subscriptions;
  };

  const filteredData = getFilteredSubscriptions();

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Not Started";
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

  const formatPrice = (val: string | number) => {
    try {
      const num = typeof val === "string" ? parseFloat(val) : val;
      return num.toLocaleString("en-IN", {
        maximumFractionDigits: 0,
      });
    } catch {
      return String(val);
    }
  };

  const getStatusBadgeLabel = (status: AmcSubscriptionStatus) => {
    switch (status) {
      case "ACTIVE":
        return "Active";
      case "RENEWED":
        return "Renewed";
      case "PENDING_APPROVAL":
        return "Pending Approval";
      case "PAYMENT_PENDING":
        return "Payment Pending";
      case "REJECTED":
        return "Rejected";
      case "CANCELLED":
        return "Cancelled";
      default:
        return status;
    }
  };

  const getStatusBadgeVariant = (status: AmcSubscriptionStatus): "success" | "warning" | "danger" | "primary" => {
    switch (status) {
      case "ACTIVE":
      case "RENEWED":
        return "success";
      case "PENDING_APPROVAL":
      case "PAYMENT_PENDING":
        return "warning";
      case "REJECTED":
      case "CANCELLED":
        return "danger";
      default:
        return "primary";
    }
  };

  const renderSubscriptionCard = ({ item }: { item: AmcSubscription }) => {
    const isVisitTrackingAvailable =
      item.status === "ACTIVE" || item.status === "RENEWED";

    return (
      <AppCard style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.titleColumn}>
            <Text style={[styles.assetName, { color: theme.colors.text }]} numberOfLines={1}>
              {item.customerAsset?.name || "Unassigned Asset"}
            </Text>
            <View style={styles.planRow}>
              <Shield size={12} color={theme.colors.primary} style={{ marginRight: 4 }} />
              <Text style={[styles.planName, { color: theme.colors.textMuted }]}>
                {item.plan?.name || "Custom Plan"}
              </Text>
            </View>
          </View>
          <AppBadge
            label={getStatusBadgeLabel(item.status)}
            variant={getStatusBadgeVariant(item.status)}
          />
        </View>

        {/* Contract specs & dates */}
        <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

        <View style={styles.infoGrid}>
          <View style={styles.infoRow}>
            <Calendar size={13} color={theme.colors.textMuted} />
            <Text style={[styles.infoLabel, { color: theme.colors.textMuted }]}>Coverage Duration:</Text>
            <Text style={[styles.infoValue, { color: theme.colors.text }]}>
              {formatDate(item.startDate)} - {formatDate(item.endDate)}
            </Text>
          </View>

          {isVisitTrackingAvailable && (
            <View style={styles.infoRow}>
              <ClipboardList size={13} color={theme.colors.textMuted} />
              <Text style={[styles.infoLabel, { color: theme.colors.textMuted }]}>Visits Remaining:</Text>
              <Text style={[styles.infoValue, { color: theme.colors.primary, fontWeight: "700" }]}>
                {item.remainingVisits} / {item.contractTotalVisits}
              </Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Clock size={13} color={theme.colors.textMuted} />
            <Text style={[styles.infoLabel, { color: theme.colors.textMuted }]}>Price Paid:</Text>
            <Text style={[styles.infoValue, { color: theme.colors.text, fontWeight: "600" }]}>
              ₹{formatPrice(item.contractPrice)}
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

        {/* View Details navigation */}
        <View style={styles.footerRow}>
          {item.rejectionReason && item.status === "REJECTED" ? (
            <View style={styles.rejectionBanner}>
              <Info size={12} color={theme.colors.danger} />
              <Text style={[styles.rejectionText, { color: theme.colors.danger }]}>
                Rejected: {item.rejectionReason}
              </Text>
            </View>
          ) : (
            <View />
          )}

          <Pressable
            style={({ pressed }) => [
              styles.detailsBtn,
              { backgroundColor: `${theme.colors.primary}0e` },
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => navigation.navigate("AmcDetails", { subscriptionId: item.id })}
          >
            <Text style={[styles.detailsBtnText, { color: theme.colors.primary }]}>View Details</Text>
            <ChevronRight size={14} color={theme.colors.primary} />
          </Pressable>
        </View>
      </AppCard>
    );
  };

  if (isLoading && page === 1) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <AppHeader title="My AMC" />
        <AppLoader message="Retrieving subscriptions..." />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="My AMC" />

      {/* Tabs Filter Bar */}
      <View style={[styles.tabBar, { borderBottomColor: theme.colors.borderLight }]}>
        {(["ALL", "ACTIVE", "PENDING", "PAST"] as FilterTab[]).map((tab) => {
          const isSelected = activeTab === tab;
          return (
            <Pressable
              key={tab}
              style={[
                styles.tabItem,
                isSelected && { borderBottomColor: theme.colors.primary },
              ]}
              onPress={() => {
                setActiveTab(tab);
                setPage(1);
              }}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: isSelected ? theme.colors.primary : theme.colors.textMuted },
                  isSelected && { fontWeight: "700" },
                ]}
              >
                {tab}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {error ? (
        <View style={styles.center}>
          <AlertTriangle size={44} color={theme.colors.danger} style={{ marginBottom: 12 }} />
          <Text style={[styles.errorText, { color: theme.colors.text }]}>
            Failed to load subscriptions.
          </Text>
          <Pressable
            style={[styles.retryBtn, { backgroundColor: theme.colors.primary }]}
            onPress={() => refetch()}
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id}
          renderItem={renderSubscriptionCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={refetch}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Shield size={44} color={theme.colors.textMuted} style={{ marginBottom: 12, opacity: 0.35 }} />
              <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                No subscriptions found under this category.
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
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  titleColumn: {
    flex: 1,
    marginRight: 8,
  },
  assetName: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  planRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  planName: {
    fontSize: 12,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  infoGrid: {
    gap: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 12,
    marginLeft: 8,
    width: 120,
  },
  infoValue: {
    fontSize: 12,
    flex: 1,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rejectionBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
    marginRight: 8,
  },
  rejectionText: {
    fontSize: 11,
    fontWeight: "600",
    flex: 1,
  },
  detailsBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 2,
  },
  detailsBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  errorText: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 16,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 13,
  },
});

export default MyAmcScreen;
