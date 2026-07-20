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
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Cpu, Info, Search, Sparkles, ShieldCheck, ChevronRight } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../theme";
import { useCustomerAssets } from "../../hooks/useCustomer";
import { useMyAmcSubscriptions } from "../../hooks/useAmc";
import { CustomerAsset } from "../../services/customer.service";
import { CustomerStackParamList } from "../../types/navigation.types";
import { AppLoader } from "../../components/AppLoader";
import { AppEmptyState } from "../../components/AppEmptyState";
import { AMCBadge } from "../../components/amc/AMCBadge";

type NavigationProp = NativeStackNavigationProp<CustomerStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GRID_CARD_W = (SCREEN_WIDTH - 32 - 12) / 2;

/* Registered Equipment Category Card */
const EquipmentCategoryCard: React.FC<{ asset: CustomerAsset }> = ({ asset }) => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const handleRaiseService = () => {
    navigation.navigate("RaiseTicket", {
      assetId: asset.id,
      assetName: asset.name,
      bookingMode: asset.hasActiveAmc ? "AMC" : "NORMAL",
      fromAMC: asset.hasActiveAmc,
    });
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.catCardUC,
        { backgroundColor: theme.colors.card, width: GRID_CARD_W },
        pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
      ]}
      onPress={handleRaiseService}
    >
      {/* Icon / Appliance Image Box */}
      <View style={[styles.catImageWrap, { backgroundColor: `${theme.colors.primary}0c` }]}>
        <Cpu size={36} color={theme.colors.primary} />
        {asset.hasActiveAmc && (
          <View style={styles.badgeOverImage}>
            <AMCBadge label="AMC Active" active />
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.cardContent}>
        <Text style={[styles.catNameUC, { color: theme.colors.text }]} numberOfLines={2}>
          {asset.name}
        </Text>

        {asset.brand || asset.model ? (
          <Text style={[styles.brandText, { color: theme.colors.textMuted }]} numberOfLines={1}>
            {[asset.brand, asset.model].filter(Boolean).join(" · ")}
          </Text>
        ) : (
          <Text style={[styles.brandText, { color: theme.colors.textMuted }]}>
            Equipment
          </Text>
        )}

        {!asset.hasActiveAmc ? (
          <View style={[styles.statusTag, { backgroundColor: `${theme.colors.textMuted}14` }]}>
            <Text style={[styles.statusTagText, { color: theme.colors.textMuted }]}>Out of AMC</Text>
          </View>
        ) : (
          <View style={[styles.statusTag, { backgroundColor: `${theme.colors.primary}14` }]}>
            <Text style={[styles.statusTagText, { color: theme.colors.primary }]}>Tap to raise service</Text>
          </View>
        )}
      </View>
    </Pressable>
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
      <FlatList
        data={filteredAssets}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
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
            {/* Active AMC Plan Dashboard Hero Card — shows this customer's own plan */}
            <TopAmcPlanBanner />

            {/* Registered Equipment Header */}
            <View style={styles.headerBlock}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                  Registered Equipment
                </Text>
                <Sparkles size={16} color={theme.colors.primary} />
              </View>
              <Text style={[styles.headerSubtitle, { color: theme.colors.textMuted }]}>
                Select an equipment to raise a service request.
              </Text>
            </View>

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
