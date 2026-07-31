import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Image,
  Pressable,
} from "react-native";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Cpu,
  ShieldCheck,
  Calendar,
  Wrench,
  Info,
  Clock,
  ChevronRight,
  PlusCircle,
  Tag,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from "lucide-react-native";
import { useTheme } from "../../theme";
import { CustomerStackParamList } from "../../types/navigation.types";
import { useCustomerAssetDetail } from "../../hooks/useCustomer";
import { useActiveAmcSubscriptionForAsset } from "../../hooks/useAmc";
import { AppHeader } from "../../components/AppHeader";
import { AppLoader } from "../../components/AppLoader";
import { AppEmptyState } from "../../components/AppEmptyState";
import { AppCard } from "../../components/AppCard";
import { AppBadge } from "../../components/AppBadge";
import { AppButton } from "../../components/AppButton";

type NavigationProp = NativeStackNavigationProp<CustomerStackParamList, "CustomerAssetDetail">;
type RouteProps = RouteProp<CustomerStackParamList, "CustomerAssetDetail">;

const formatDate = (dateStr: string | null): string => {
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

const getAssetCategoryFallbackImage = (name: string): string => {
  const n = name.toLowerCase();
  if (n.includes("electric") || n.includes("power") || n.includes("wire") || n.includes("inverter") || n.includes("fan"))
    return "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=260&fit=crop";
  if (n.includes("plumb") || n.includes("water") || n.includes("pipe") || n.includes("tap") || n.includes("sink"))
    return "https://images.unsplash.com/photo-1607400201889-565b1ee75f8e?w=400&h=260&fit=crop";
  if (n.includes("ac") || n.includes("air con") || n.includes("cool") || n.includes("hvac") || n.includes("refriger"))
    return "https://images.unsplash.com/photo-1563014572-74af7be95775?w=400&h=260&fit=crop";
  return "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=260&fit=crop";
};

export const CustomerAssetDetailScreen: React.FC = () => {
  const theme = useTheme();
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const { assetId } = route.params;

  const { data: asset, isLoading, isError, refetch, isFetching } = useCustomerAssetDetail(assetId);
  const { data: activeAmcSub } = useActiveAmcSubscriptionForAsset(assetId);
  const [imageError, setImageError] = useState(false);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <AppHeader title="Asset Details" showBack onBackPress={() => navigation.goBack()} />
        <AppLoader message="Retrieving asset details..." />
      </View>
    );
  }

  if (isError || !asset) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <AppHeader title="Asset Details" showBack onBackPress={() => navigation.goBack()} />
        <AppEmptyState
          title="Asset Not Found"
          description="Could not load details for this asset."
          actionLabel="Retry"
          onAction={() => refetch()}
        />
      </View>
    );
  }

  const firstImageUrl = asset.images && asset.images.length > 0 ? asset.images[0].imageUrl : null;
  const showUploadedImage = firstImageUrl && !imageError;

  // AMC calculations derived from API responses
  const hasAmc = asset.hasActiveAmc;
  const planName = activeAmcSub?.plan?.name || (asset as any).activeAmcPlanName || (hasAmc ? "Active AMC Plan" : null);
  const remainingVisits = activeAmcSub?.remainingVisits;
  const totalVisits = activeAmcSub?.contractTotalVisits ?? activeAmcSub?.plan?.visitCount;
  const startDate = activeAmcSub?.startDate;
  const endDate = activeAmcSub?.endDate;
  const coverageTerms = activeAmcSub?.contractCoverageTerms ?? activeAmcSub?.plan?.coverageTerms;
  const isExpired = endDate ? new Date(endDate).getTime() < Date.now() : false;

  // Warranty status
  const isWarrantyValid = asset.warrantyExpiresAt ? new Date(asset.warrantyExpiresAt).getTime() > Date.now() : false;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader title={asset.name} showBack onBackPress={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={theme.colors.primary} />
        }
      >
        {/* Banner Asset Header */}
        <AppCard style={styles.bannerCard}>
          <View style={styles.bannerRow}>
            <View style={[styles.assetImageWrap, { backgroundColor: theme.colors.background, borderColor: theme.colors.borderLight }]}>
              <Image
                source={{ uri: showUploadedImage ? firstImageUrl! : getAssetCategoryFallbackImage(asset.name) }}
                style={styles.assetImage}
                resizeMode="cover"
                onError={() => setImageError(true)}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.assetName, { color: theme.colors.text }]}>{asset.name}</Text>
              {(asset.brand || asset.model) ? (
                <Text style={{ fontSize: 13, color: theme.colors.textMuted, marginTop: 2 }}>
                  {[asset.brand, asset.model].filter(Boolean).join(" · ")}
                </Text>
              ) : null}
              {asset.category ? (
                <View style={{ marginTop: 6, alignSelf: "flex-start" }}>
                  <AppBadge label={asset.category.name} variant="primary" />
                </View>
              ) : null}
            </View>
          </View>
        </AppCard>

        {/* 1. Asset Information Card */}
        <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>Asset Information</Text>
        <AppCard style={styles.detailsCard}>
          <View style={styles.infoRow}>
            <View style={[styles.iconBadge, { backgroundColor: `${theme.colors.primary}12` }]}>
              <Cpu size={15} color={theme.colors.primary} />
            </View>
            <Text style={[styles.infoLabel, { color: theme.colors.textMuted }]}>Asset Name</Text>
            <Text style={[styles.infoValue, { color: theme.colors.text, fontWeight: "700" }]}>{asset.name}</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={[styles.iconBadge, { backgroundColor: `${theme.colors.primary}12` }]}>
              <Tag size={15} color={theme.colors.primary} />
            </View>
            <Text style={[styles.infoLabel, { color: theme.colors.textMuted }]}>Brand & Model</Text>
            <Text style={[styles.infoValue, { color: theme.colors.text }]}>
              {[asset.brand, asset.model].filter(Boolean).join(" · ") || "—"}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <View style={[styles.iconBadge, { backgroundColor: `${theme.colors.primary}12` }]}>
              <Info size={15} color={theme.colors.primary} />
            </View>
            <Text style={[styles.infoLabel, { color: theme.colors.textMuted }]}>Serial Number</Text>
            <Text style={[styles.infoValue, { color: theme.colors.text }]}>{asset.serialNumber || "—"}</Text>
          </View>

          {asset.installationAddress ? (
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <View style={[styles.iconBadge, { backgroundColor: `${theme.colors.primary}12` }]}>
                <Info size={15} color={theme.colors.primary} />
              </View>
              <Text style={[styles.infoLabel, { color: theme.colors.textMuted }]}>Installation Site</Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]} numberOfLines={2}>
                {asset.installationAddress}
              </Text>
            </View>
          ) : null}
        </AppCard>

        {/* 2. Warranty Information Card */}
        <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>Warranty Information</Text>
        <AppCard style={styles.detailsCard}>
          <View style={styles.infoRow}>
            <View style={[styles.iconBadge, { backgroundColor: isWarrantyValid ? `${theme.colors.success}15` : `${theme.colors.danger}15` }]}>
              <ShieldCheck size={15} color={isWarrantyValid ? theme.colors.success : theme.colors.danger} />
            </View>
            <Text style={[styles.infoLabel, { color: theme.colors.textMuted }]}>Warranty Status</Text>
            <AppBadge
              label={asset.warrantyExpiresAt ? (isWarrantyValid ? "ACTIVE WARRANTY" : "EXPIRED") : "NO WARRANTY"}
              variant={asset.warrantyExpiresAt ? (isWarrantyValid ? "success" : "danger") : "primary"}
            />
          </View>

          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <View style={[styles.iconBadge, { backgroundColor: `${theme.colors.primary}12` }]}>
              <Calendar size={15} color={theme.colors.primary} />
            </View>
            <Text style={[styles.infoLabel, { color: theme.colors.textMuted }]}>Expiry Date</Text>
            <Text style={[styles.infoValue, { color: theme.colors.text, fontWeight: "600" }]}>
              {formatDate(asset.warrantyExpiresAt)}
            </Text>
          </View>
        </AppCard>

        {/* 3. AMC Details Card (Placed immediately BELOW Warranty Information) */}
        <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>AMC Details</Text>
        <AppCard style={[styles.amcCard, { borderColor: hasAmc ? `${theme.colors.success}35` : theme.colors.borderLight }]}>
          {hasAmc ? (
            <View>
              {/* Header Status Row */}
              <View style={styles.amcHeaderRow}>
                <View style={[styles.amcStatusBadge, { backgroundColor: `${theme.colors.success}15` }]}>
                  <View style={[styles.greenDot, { backgroundColor: theme.colors.success }]} />
                  <Text style={[styles.amcStatusText, { color: theme.colors.success }]}>
                    {isExpired ? "EXPIRED AMC" : "🟢 Active AMC"}
                  </Text>
                </View>
                {activeAmcSub?.id ? (
                  <Pressable
                    onPress={() => navigation.navigate("AmcDetails", { subscriptionId: activeAmcSub.id })}
                    style={({ pressed }) => [styles.viewDetailsBtn, pressed && { opacity: 0.8 }]}
                  >
                    <Text style={[styles.viewDetailsBtnText, { color: theme.colors.primary }]}>View Full Contract</Text>
                    <ChevronRight size={13} color={theme.colors.primary} />
                  </Pressable>
                ) : null}
              </View>

              <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

              {/* Plan Name */}
              {planName ? (
                <View style={styles.amcRow}>
                  <Text style={[styles.amcLabel, { color: theme.colors.textMuted }]}>Plan Name</Text>
                  <Text style={[styles.amcValue, { color: theme.colors.text, fontWeight: "700" }]}>
                    {planName}
                  </Text>
                </View>
              ) : null}

              {/* Status */}
              <View style={styles.amcRow}>
                <Text style={[styles.amcLabel, { color: theme.colors.textMuted }]}>Status</Text>
                <Text style={[styles.amcValue, { color: theme.colors.success, fontWeight: "700" }]}>
                  {isExpired ? "EXPIRED" : "ACTIVE"}
                </Text>
              </View>

              {/* Start Date (If available) */}
              {startDate ? (
                <View style={styles.amcRow}>
                  <Text style={[styles.amcLabel, { color: theme.colors.textMuted }]}>Start Date</Text>
                  <Text style={[styles.amcValue, { color: theme.colors.text }]}>
                    {formatDate(startDate)}
                  </Text>
                </View>
              ) : null}

              {/* Expiry Date (If available) */}
              {endDate ? (
                <View style={styles.amcRow}>
                  <Text style={[styles.amcLabel, { color: theme.colors.textMuted }]}>Expiry Date</Text>
                  <Text style={[styles.amcValue, { color: theme.colors.text }]}>
                    {formatDate(endDate)}
                  </Text>
                </View>
              ) : null}

              {/* Remaining Visits (If available) */}
              {remainingVisits != null && totalVisits != null ? (
                <View style={styles.amcRow}>
                  <Text style={[styles.amcLabel, { color: theme.colors.textMuted }]}>Remaining Visits</Text>
                  <Text style={[styles.amcValue, { color: theme.colors.primary, fontWeight: "700" }]}>
                    {remainingVisits} / {totalVisits}
                  </Text>
                </View>
              ) : null}

              {/* Coverage terms / Description (If available) */}
              {coverageTerms ? (
                <View style={{ marginTop: 8 }}>
                  <Text style={[styles.amcLabel, { color: theme.colors.textMuted, marginBottom: 4 }]}>Coverage Terms</Text>
                  <Text style={{ fontSize: 12, color: theme.colors.text, lineHeight: 17 }}>
                    {coverageTerms}
                  </Text>
                </View>
              ) : (
                <Text style={{ fontSize: 12, color: theme.colors.textMuted, marginTop: 6, fontStyle: "italic" }}>
                  This asset is protected under an active AMC contract.
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.noAmcBox}>
              <View style={styles.noAmcHeaderRow}>
                <View style={[styles.noAmcBadge, { backgroundColor: `${theme.colors.textMuted}15` }]}>
                  <View style={[styles.grayDot, { backgroundColor: theme.colors.textMuted }]} />
                  <Text style={[styles.noAmcText, { color: theme.colors.textMuted }]}>⚪ No Active AMC</Text>
                </View>
              </View>
              <Text style={{ fontSize: 13, color: theme.colors.textMuted, marginTop: 10, lineHeight: 18 }}>
                No Active AMC for this asset.
              </Text>
            </View>
          )}
        </AppCard>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  bannerCard: {
    marginBottom: 16,
    padding: 14,
  },
  bannerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  assetImageWrap: {
    width: 64,
    height: 64,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  assetImage: {
    width: "100%",
    height: "100%",
  },
  assetName: {
    fontSize: 16,
    fontWeight: "800",
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 4,
  },
  detailsCard: {
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  infoLabel: {
    fontSize: 13,
    flex: 1,
  },
  infoValue: {
    fontSize: 13,
  },
  amcCard: {
    marginBottom: 16,
    borderWidth: 1.5,
    padding: 14,
  },
  amcHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  amcStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  amcStatusText: {
    fontSize: 12,
    fontWeight: "800",
  },
  viewDetailsBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewDetailsBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  amcRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  amcLabel: {
    fontSize: 13,
  },
  amcValue: {
    fontSize: 13,
  },
  noAmcBox: {
    paddingVertical: 4,
  },
  noAmcHeaderRow: {
    flexDirection: "row",
  },
  noAmcBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  grayDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  noAmcText: {
    fontSize: 12,
    fontWeight: "700",
  },
});

export default CustomerAssetDetailScreen;
