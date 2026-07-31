import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  TextInput,
  Dimensions,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Cpu, Info, Search, Sparkles, ShieldCheck, ChevronRight, Ticket, PlusCircle, Wrench, AlertCircle } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../theme";
import { useCustomerAssets } from "../../hooks/useCustomer";
import { useMyAmcSubscriptions, useActiveAmcSubscriptionForAsset } from "../../hooks/useAmc";
import { CustomerAsset } from "../../services/customer.service";
import { CustomerStackParamList } from "../../types/navigation.types";
import { AppHeader } from "../../components/AppHeader";
import { AppLoader } from "../../components/AppLoader";
import { AppEmptyState } from "../../components/AppEmptyState";
import { AMCBadge } from "../../components/amc/AMCBadge";

type NavigationProp = NativeStackNavigationProp<CustomerStackParamList>;

const getAssetCategoryFallbackImage = (name: string): string => {
  const n = name.toLowerCase();
  if (n.includes("electric") || n.includes("power") || n.includes("wire") || n.includes("wiring") || n.includes("inverter") || n.includes("fan"))
    return "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=260&fit=crop";
  if (n.includes("plumb") || n.includes("water") || n.includes("leak") || n.includes("pipe") || n.includes("tap") || n.includes("sink"))
    return "https://images.unsplash.com/photo-1607400201889-565b1ee75f8e?w=400&h=260&fit=crop";
  if (n.includes("ac") || n.includes("air con") || n.includes("cool") || n.includes("hvac") || n.includes("refriger"))
    return "https://images.unsplash.com/photo-1563014572-74af7be95775?w=400&h=260&fit=crop";
  if (n.includes("carpent") || n.includes("wood") || n.includes("furniture") || n.includes("cabinet"))
    return "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&h=260&fit=crop";
  if (n.includes("paint") || n.includes("colour") || n.includes("color"))
    return "https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=400&h=260&fit=crop";
  if (n.includes("clean") || n.includes("sweep") || n.includes("mop"))
    return "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=260&fit=crop";
  if (n.includes("appliance") || n.includes("washing") || n.includes("fridge") || n.includes("microwave"))
    return "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=260&fit=crop";
  return "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=260&fit=crop";
};

/* Per-Asset AMC Plan Equipment Card Component */
const EquipmentCategoryCard: React.FC<{ asset: CustomerAsset }> = ({ asset }) => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { data: activeAmcSub } = useActiveAmcSubscriptionForAsset(asset.id);
  const [imageError, setImageError] = useState(false);

  const planName = activeAmcSub?.plan?.name || (asset as any).activeAmcPlanName || (asset.hasActiveAmc ? "Active AMC Plan" : null);
  const remaining = activeAmcSub?.remainingVisits ?? 0;
  const total = activeAmcSub?.contractTotalVisits ?? activeAmcSub?.plan?.visitCount ?? 0;
  const isExpired = activeAmcSub?.endDate ? new Date(activeAmcSub.endDate).getTime() < Date.now() : false;
  const isExhausted = remaining <= 0;
  const canRaiseTicket = asset.hasActiveAmc && !isExpired && !isExhausted;

  const firstImageUrl = asset.images && asset.images.length > 0 ? asset.images[0].imageUrl : null;
  const showUploadedImage = firstImageUrl && !imageError;

  const expiryDate = activeAmcSub?.endDate
    ? new Date(activeAmcSub.endDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

  const handleRaiseTicket = () => {
    if (!canRaiseTicket) return;
    navigation.navigate("RaiseTicket", {
      assetId: asset.id,
      assetName: asset.name,
    });
  };

  return (
    <View
      style={[
        styles.assetAmcCardWrap,
        { backgroundColor: theme.colors.card, borderColor: theme.colors.borderLight },
      ]}
    >
      {/* Top Header Row: Asset Thumbnail + Name + AMC Status Badge (Tapping opens Asset Details) */}
      <Pressable
        onPress={() => navigation.navigate("CustomerAssetDetail", { assetId: asset.id })}
        style={({ pressed }) => [styles.assetCardHeaderRow, pressed && { opacity: 0.85 }]}
      >
        <View style={[styles.assetThumbBox, { backgroundColor: theme.colors.background, borderColor: theme.colors.borderLight }]}>
          <Image
            source={{ uri: showUploadedImage ? firstImageUrl! : getAssetCategoryFallbackImage(asset.name) }}
            style={styles.assetThumbImage}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        </View>

        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={[styles.assetCardTitle, { color: theme.colors.text }]} numberOfLines={1}>
            {asset.name}
          </Text>
          {asset.brand || asset.model ? (
            <Text style={[styles.assetCardSubtitle, { color: theme.colors.textMuted }]} numberOfLines={1}>
              {[asset.brand, asset.model].filter(Boolean).join(" · ")}
            </Text>
          ) : null}
        </View>
        <View style={styles.assetBadgeContainer}>
          <AMCBadge
            label={asset.hasActiveAmc ? (isExpired ? "Expired" : "🟢 Active AMC") : "⚪ No AMC"}
            active={asset.hasActiveAmc && !isExpired}
          />
        </View>
      </Pressable>

      {/* AMC Plan Details Box (if asset has AMC coverage) */}
      {asset.hasActiveAmc && (
        <View style={[styles.planDetailsBox, { backgroundColor: `${theme.colors.primary}0a`, borderColor: `${theme.colors.primary}25` }]}>
          <View style={styles.planHeaderLine}>
            <View style={styles.planTitleWrap}>
              <ShieldCheck size={15} color={theme.colors.primary} />
              <Text style={[styles.planTitleText, { color: theme.colors.primary }]} numberOfLines={1}>
                {planName || "AMC Plan"}
              </Text>
            </View>

            {/* View History Action Pill */}
            <Pressable
              onPress={() => {
                if (activeAmcSub?.id) {
                  navigation.navigate("AmcDetails", { subscriptionId: activeAmcSub.id });
                }
              }}
              style={({ pressed }) => [
                styles.viewHistoryPillBtn,
                { backgroundColor: theme.colors.primary },
                pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
              ]}
            >
              <Text style={styles.viewHistoryPillBtnText}>View History</Text>
              <ChevronRight size={12} color="#ffffff" />
            </Pressable>
          </View>

          <View style={styles.planStatsRow}>
            <View style={styles.planStatCol}>
              <Text style={[styles.planStatValue, { color: isExhausted ? theme.colors.danger : theme.colors.text }]}>
                {remaining} / {total}
              </Text>
              <Text style={[styles.planStatLabel, { color: theme.colors.textMuted }]}>Visits Remaining</Text>
            </View>

            <View style={styles.planStatDivider} />

            <View style={styles.planStatCol}>
              <Text style={[styles.planStatValue, { color: isExpired ? theme.colors.danger : theme.colors.text }]}>
                {expiryDate || "Active"}
              </Text>
              <Text style={[styles.planStatLabel, { color: theme.colors.textMuted }]}>
                {isExpired ? "Expired" : "Expires"}
              </Text>
            </View>
          </View>
        </View>
      )}

    </View>
  );
};

/* Active AMC Plan Hero Banner — shows the customer's own active plan */
const TopAmcPlanBanner: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { data: subsData } = useMyAmcSubscriptions({ status: "ACTIVE" });
  const activeSub = subsData?.data?.[0];

  if (!activeSub) return null;

  const planName = activeSub.plan?.name || (activeSub as any).planName || "Active AMC Plan";
  const remaining = activeSub.remainingVisits ?? "—";
  const total = activeSub.contractTotalVisits ?? activeSub.plan?.visitCount ?? "—";
  const expiryDate = activeSub.endDate
    ? new Date(activeSub.endDate).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
    : "Active";

  return (
    <View style={styles.dashboardBannerWrap}>
      <LinearGradient
        colors={[`${theme.colors.primary}ee`, theme.colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.dashboardBanner}
      >
        {/* Top row: badge + action */}
        <View style={styles.bannerHeaderRow}>
          <View style={styles.bannerBadgeTag}>
            <ShieldCheck size={14} color="#ffffff" />
            <Text style={styles.bannerBadgeText}>ACTIVE AMC PLAN</Text>
          </View>
          <Pressable
            onPress={() =>
              navigation.navigate("AmcDetails", { subscriptionId: activeSub.id })
            }
            style={({ pressed }) => [styles.viewAmcBtn, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.viewAmcBtnText}>View Details</Text>
            <ChevronRight size={13} color={theme.colors.primary} />
          </Pressable>
        </View>

        {/* Plan name */}
        <Text style={styles.bannerTitle} numberOfLines={1}>
          {planName}
        </Text>
        <Text style={styles.bannerSub}>
          Priority scheduling · Free maintenance · Zero labour charges
        </Text>

        {/* Metrics strip */}
        <View style={styles.metricsRow}>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>
              {remaining} / {total}
            </Text>
            <Text style={styles.metricLabel}>Visits Remaining</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>{expiryDate}</Text>
            <Text style={styles.metricLabel}>Expires</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricBox}>
            <Text style={[styles.metricValue, { color: "#34D399" }]}>Active</Text>
            <Text style={styles.metricLabel}>Status</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

export const CustomerAssetsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const {
    data: assets = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = useCustomerAssets();
  const [searchQuery, setSearchQuery] = useState("");

  /* Search Filtering Logic */
  const filteredAssets = useMemo(() => {
    if (!searchQuery.trim()) return assets;
    const q = searchQuery.toLowerCase();
    return assets.filter((asset) => {
      const matchName = asset.name?.toLowerCase().includes(q);
      const matchBrand = asset.brand?.toLowerCase().includes(q);
      const matchModel = asset.model?.toLowerCase().includes(q);
      return matchName || matchBrand || matchModel;
    });
  }, [assets, searchQuery]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <AppLoader message="Loading equipment..." />
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.colors.background, ...styles.center },
        ]}
      >
        <Info size={40} color={theme.colors.danger} style={{ marginBottom: 12 }} />
        <Text style={[styles.errorTitle, { color: theme.colors.text }]}>
          Unable to load equipment
        </Text>
        <Pressable
          onPress={() => refetch()}
          style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="My Assets" showBack onBackPress={() => navigation.goBack()} />
      <FlatList
        data={filteredAssets}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <EquipmentCategoryCard asset={item} />}
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
          <View style={{ marginBottom: 16 }}>
            {/* Search Bar */}
            <View
              style={[
                styles.searchBar,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.borderLight,
                },
              ]}
            >
              <Search size={17} color={theme.colors.textMuted} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search Equipment"
                placeholderTextColor={theme.colors.textLight}
                style={[styles.searchInput, { color: theme.colors.text }]}
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          <AppEmptyState
            title="No Registered Equipment"
            description="Register equipment after purchasing an AMC plan."
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120,
  },
  columnWrapper: {
    justifyContent: "space-between",
    marginBottom: 12,
  },

  /* Header Block */
  headerBlock: {
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 4,
    lineHeight: 18,
  },

  /* Dashboard Banner Hero Card */
  dashboardBannerWrap: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "rgba(15,23,42,0.15)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 4,
    marginBottom: 16,
  },
  dashboardBanner: {
    padding: 18,
    borderRadius: 20,
  },
  bannerHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  bannerBadgeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.20)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  bannerBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: 1.1,
  },
  viewAmcBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
  },
  viewAmcBtnText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#4F6FE8",
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.3,
    marginBottom: 3,
  },
  bannerSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 17,
    marginBottom: 14,
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.18)",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  metricBox: {
    flex: 1,
    alignItems: "center",
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#ffffff",
  },
  metricLabel: {
    fontSize: 9.5,
    color: "rgba(255,255,255,0.75)",
    fontWeight: "600",
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 20,
    backgroundColor: "rgba(255,255,255,0.20)",
  },

  /* Search Bar */
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    paddingVertical: 0,
  },

  /* Category Card Proportions & Style */
  catCardUC: {
    borderRadius: 14,
    overflow: "hidden",
    alignItems: "center",
    paddingBottom: 12,
    shadowColor: "rgba(15,23,42,0.09)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  catImageWrap: {
    width: "100%",
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  badgeOverImage: {
    position: "absolute",
    top: 6,
    right: 6,
  },
  cardContent: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 8,
    marginTop: 8,
  },
  catNameUC: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 17,
  },
  brandText: {
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 3,
  },
  statusTag: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: "600",
  },

  /* Per-Asset AMC Card Styles */
  assetAmcCardWrap: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    shadowColor: "rgba(15,23,42,0.06)",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  assetCardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  assetThumbBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    shadowColor: "rgba(15,23,42,0.08)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  assetThumbImage: {
    width: "100%",
    height: "100%",
  },
  assetCardTitle: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  assetCardSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  assetBadgeContainer: {
    alignItems: "flex-end",
  },
  planDetailsBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginTop: 4,
    marginBottom: 12,
  },
  planHeaderLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  planTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  planTitleText: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: -0.1,
  },
  viewHistoryPillBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  viewHistoryPillBtnText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#ffffff",
  },
  planStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 4,
  },
  planStatCol: {
    flex: 1,
    alignItems: "center",
  },
  planStatValue: {
    fontSize: 14,
    fontWeight: "800",
  },
  planStatLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
  planStatDivider: {
    width: 1,
    height: 22,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  /* Raise Ticket Gradient Button Styles */
  raiseTicketGradientWrap: {
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "rgba(59, 130, 246, 0.35)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 4,
  },
  raiseTicketGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  actionIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  raiseTicketText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.2,
    marginLeft: 10,
    flex: 1,
  },
  arrowIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  disabledStatusBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "flex-start",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  disabledStatusText: {
    fontSize: 12.5,
    fontWeight: "700",
    lineHeight: 18,
    flex: 1,
  },

  /* Center / Errors */
  center: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },
  retryButton: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 12,
  },
  retryButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
});

export default CustomerAssetsScreen;
