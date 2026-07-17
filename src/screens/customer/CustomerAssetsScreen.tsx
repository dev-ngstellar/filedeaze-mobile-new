import React from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl, Pressable, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Cpu, Info, Wrench, ClipboardList, ChevronRight } from "lucide-react-native";
import { useTheme } from "../../theme";
import { useCustomerAssets } from "../../hooks/useCustomer";
import { useActiveAmcSubscriptionForAsset } from "../../hooks/useAmc";
import { CustomerAsset } from "../../services/customer.service";
import { CustomerStackParamList } from "../../types/navigation.types";
import { AppLoader } from "../../components/AppLoader";
import { AppEmptyState } from "../../components/AppEmptyState";
import { AppCard } from "../../components/AppCard";
import { AppButton } from "../../components/AppButton";
import { AMCBadge } from "../../components/amc/AMCBadge";

type NavigationProp = NativeStackNavigationProp<CustomerStackParamList>;

const AssetCard: React.FC<{ asset: CustomerAsset }> = ({ asset }) => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();

  // Only resolved when the asset actually has active AMC — avoids a wasted lookup per card otherwise.
  const { data: activeSub, isFetching: isResolvingAmc } = useActiveAmcSubscriptionForAsset(
    asset.hasActiveAmc ? asset.id : ""
  );

  const handleViewAmc = () => {
    if (activeSub) {
      navigation.navigate("AmcDetails", { subscriptionId: activeSub.id });
    }
  };

  const handleRaiseService = () => {
    navigation.navigate("RaiseTicket", {
      assetId: asset.id,
      assetName: asset.name,
    });
  };

  return (
    <AppCard style={styles.card}>
      <View style={styles.headerRow}>
        <View style={[styles.iconCircle, { backgroundColor: `${theme.colors.primary}12` }]}>
          <Cpu size={20} color={theme.colors.primary} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.assetName, { color: theme.colors.text }]} numberOfLines={1}>
            {asset.name}
          </Text>
          {(asset.brand || asset.model) ? (
            <Text style={[styles.assetMeta, { color: theme.colors.textMuted }]} numberOfLines={1}>
              {[asset.brand, asset.model].filter(Boolean).join(" · ")}
            </Text>
          ) : null}
        </View>
      </View>

      {asset.hasActiveAmc ? (
        <View style={[styles.amcStrip, { backgroundColor: `${theme.colors.success}0c`, borderColor: `${theme.colors.success}25` }]}>
          <AMCBadge label="AMC Active" active />
        </View>
      ) : null}

      <View style={styles.actionsRow}>
        {asset.hasActiveAmc ? (
          <>
            <AppButton
              title="View AMC"
              variant="outline"
              size="sm"
              onPress={handleViewAmc}
              disabled={isResolvingAmc || !activeSub}
              icon={isResolvingAmc ? <ActivityIndicator size="small" color={theme.colors.primary} /> : undefined}
              style={{ flex: 1 }}
            />
            <AppButton
              title="Raise AMC Service"
              size="sm"
              onPress={handleRaiseService}
              style={{ flex: 1 }}
            />
          </>
        ) : (
          <AppButton
            title="Raise Service"
            size="sm"
            icon={<Wrench size={14} color="#ffffff" />}
            onPress={handleRaiseService}
            style={{ flex: 1 }}
          />
        )}
      </View>
    </AppCard>
  );
};

export const CustomerAssetsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { data: assets, isLoading, error, refetch, isFetching } = useCustomerAssets();

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <AppLoader message="Loading your assets..." />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, ...styles.center }]}>
        <Info size={40} color={theme.colors.danger} style={{ marginBottom: 12 }} />
        <Text style={[styles.errorText, { color: theme.colors.text }]}>Failed to load your assets.</Text>
        <Pressable onPress={() => refetch()} style={[styles.retryBtn, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={assets ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <AssetCard asset={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={theme.colors.primary} />}
        ListHeaderComponent={
          <Pressable
            onPress={() => navigation.navigate("MyAmc")}
            style={({ pressed }) => [
              styles.myAmcLink,
              { borderColor: theme.colors.borderLight, backgroundColor: theme.colors.card },
              pressed && { opacity: 0.8 },
            ]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <ClipboardList size={16} color={theme.colors.primary} />
              <Text style={[styles.myAmcLinkText, { color: theme.colors.text }]}>View All My AMC Contracts</Text>
            </View>
            <ChevronRight size={16} color={theme.colors.textMuted} />
          </Pressable>
        }
        ListEmptyComponent={
          <AppEmptyState
            title="No Registered Assets"
            description="Your registered appliances will appear here once added by our team, along with any active AMC coverage."
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 40 },
  card: { marginBottom: 14, borderRadius: 16, padding: 16 },
  headerRow: { flexDirection: "row", alignItems: "center" },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  assetName: { fontSize: 15, fontWeight: "700" },
  assetMeta: { fontSize: 12, marginTop: 2 },
  amcStrip: { marginTop: 12, padding: 10, borderRadius: 10, borderWidth: 1, flexDirection: "row", alignItems: "center" },
  myAmcLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  myAmcLinkText: { fontSize: 13, fontWeight: "700" },
  actionsRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  center: { justifyContent: "center", alignItems: "center", paddingHorizontal: 32 },
  errorText: { fontSize: 13, fontWeight: "600", marginBottom: 16 },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryBtnText: { color: "#ffffff", fontWeight: "700", fontSize: 13 },
});

export default CustomerAssetsScreen;
