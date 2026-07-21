import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Modal,
  TextInput,
  Pressable,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Calendar,
  Clock,
  ClipboardList,
  Tag,
  Wrench,
  Cpu,
  Info,
} from "lucide-react-native";
import { useTheme } from "../../theme";
import { useAmcSubscriptionDetails, useCancelAmcRequest } from "../../hooks/useAmc";
import { CustomerStackParamList } from "../../types/navigation.types";
import { AppHeader } from "../../components/AppHeader";
import { AppLoader } from "../../components/AppLoader";
import { AppEmptyState } from "../../components/AppEmptyState";
import { AppCard } from "../../components/AppCard";
import { AppBadge } from "../../components/AppBadge";
import { AppButton } from "../../components/AppButton";
import { CustomerPopup } from "../../components/CustomerPopup";
import { AMCPlanCard } from "../../components/amc/AMCPlanCard";
import { AMCVisitCard } from "../../components/amc/AMCVisitCard";
import { AMCCoverageCard } from "../../components/amc/AMCCoverageCard";
import { AmcSubscriptionStatus, AmcVisit, AmcVisitStatus } from "../../services/amc.service";

type NavigationProp = NativeStackNavigationProp<CustomerStackParamList, "AmcDetails">;
type RouteType = RouteProp<CustomerStackParamList, "AmcDetails">;

// ─────────────────────────── helpers ────────────────────────────────────────

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    const day = d.getDate().toString().padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return dateStr;
  }
};

const formatPrice = (val: string | number): string => {
  try {
    const num = typeof val === "string" ? parseFloat(val) : val;
    return `₹${num.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  } catch {
    return String(val);
  }
};

const visitStatusLabel = (s: AmcVisitStatus): string => {
  const map: Record<AmcVisitStatus, string> = {
    SCHEDULED: "Scheduled",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    RESCHEDULED: "Rescheduled",
    NO_SHOW: "No Show",
  };
  return map[s] ?? s;
};

const visitStatusVariant = (
  s: AmcVisitStatus
): "success" | "warning" | "danger" | "primary" => {
  if (s === "COMPLETED") return "success";
  if (s === "SCHEDULED" || s === "RESCHEDULED") return "warning";
  if (s === "CANCELLED" || s === "NO_SHOW") return "danger";
  return "primary";
};

// ─────────────────────────── component ──────────────────────────────────────

export const AmcDetailsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { subscriptionId } = route.params;

  // Query and mutation hooks
  const { data: sub, isLoading, error, refetch, isFetching } = useAmcSubscriptionDetails(subscriptionId);
  const cancelMutation = useCancelAmcRequest();

  // Cancel dialog input states
  const [cancelDialogVisible, setCancelDialogVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelValidationError, setCancelValidationError] = useState("");
  const [successVisible, setSuccessVisible] = useState(false);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <AppHeader title="AMC Details" />
        <AppLoader message="Loading contract details..." />
      </View>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error || !sub) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <AppHeader title="AMC Details" />
        <AppEmptyState
          title="Could Not Load"
          description="Failed to load contract details. Please try again."
          actionLabel="Retry"
          onAction={() => refetch()}
        />
      </View>
    );
  }

  const visits: AmcVisit[] = sub.visits ?? [];
  const completedVisits = visits.filter((v) => v.status === "COMPLETED").length;
  const coverageTerms = sub.contractCoverageTerms ?? sub.plan?.coverageTerms ?? null;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="AMC Details" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={refetch}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* ── Section 1: AMC Name Header ── */}
        <View style={styles.headerPlanWrap}>
          <AMCPlanCard
            planName={sub.plan?.name ?? "—"}
            status={sub.status}
            subtitle={sub.endDate ? `Expires ${formatDate(sub.endDate)}` : undefined}
          />
        </View>

        {/* ── Section 2: Visit Stats (Total, Used, Remaining) ── */}
        <View style={styles.statsCardWrap}>
          <AMCVisitCard
            totalVisits={sub.contractTotalVisits ?? sub.plan?.visitCount ?? 0}
            completedVisits={completedVisits}
            remainingVisits={sub.remainingVisits ?? 0}
          />
        </View>

        {/* ── Section 3: Contract Details ── */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionTitleRow}>
            <ClipboardList size={16} color={theme.colors.primary} />
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Contract Details</Text>
          </View>
          <AppCard style={styles.detailsCard}>
            <View style={styles.infoRow}>
              <View style={styles.iconBadge}><Calendar size={14} color={theme.colors.primary} /></View>
              <Text style={[styles.infoLabel, { color: theme.colors.textMuted }]}>Start Date</Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>{formatDate(sub.startDate)}</Text>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.iconBadge}><Calendar size={14} color={theme.colors.primary} /></View>
              <Text style={[styles.infoLabel, { color: theme.colors.textMuted }]}>End Date</Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>{formatDate(sub.endDate)}</Text>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.iconBadge}><Clock size={14} color={theme.colors.primary} /></View>
              <Text style={[styles.infoLabel, { color: theme.colors.textMuted }]}>Duration</Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>{sub.contractDurationMonths} months</Text>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.iconBadge}><ClipboardList size={14} color={theme.colors.primary} /></View>
              <Text style={[styles.infoLabel, { color: theme.colors.textMuted }]}>Total Visits</Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>{sub.contractTotalVisits} visits</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <View style={styles.iconBadge}><Tag size={14} color={theme.colors.primary} /></View>
              <Text style={[styles.infoLabel, { color: theme.colors.textMuted }]}>Contract Price</Text>
              <Text style={[styles.infoValue, { color: theme.colors.primary, fontWeight: "800", fontSize: 15 }]}>
                {formatPrice(sub.contractPrice)}
              </Text>
            </View>
          </AppCard>
        </View>

        {/* ── Section 4: Asset Details ── */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionTitleRow}>
            <Cpu size={16} color={theme.colors.primary} />
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Asset Details</Text>
          </View>
          <AppCard style={styles.detailsCard}>
            <View style={styles.infoRow}>
              <View style={styles.iconBadge}><Cpu size={14} color={theme.colors.primary} /></View>
              <Text style={[styles.infoLabel, { color: theme.colors.textMuted }]}>Asset Name</Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                {sub.customerAsset?.name ?? "—"}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.iconBadge}><Info size={14} color={theme.colors.primary} /></View>
              <Text style={[styles.infoLabel, { color: theme.colors.textMuted }]}>Brand</Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                {sub.customerAsset?.brand ?? "—"}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.iconBadge}><Info size={14} color={theme.colors.primary} /></View>
              <Text style={[styles.infoLabel, { color: theme.colors.textMuted }]}>Model</Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                {sub.customerAsset?.model ?? "—"}
              </Text>
            </View>
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <View style={styles.iconBadge}><Info size={14} color={theme.colors.primary} /></View>
              <Text style={[styles.infoLabel, { color: theme.colors.textMuted }]}>Serial Number</Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                {sub.customerAsset?.serialNumber ?? "—"}
              </Text>
            </View>
          </AppCard>
        </View>

        {/* ── Section 5: Service Visit History ── */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionTitleRow}>
            <Wrench size={16} color={theme.colors.primary} />
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Service Visit History</Text>
          </View>
          {visits.length === 0 ? (
            <AppCard style={styles.detailsCard}>
              <Text style={[styles.emptyVisitsText, { color: theme.colors.textMuted }]}>
                No service visits logged for this contract yet.
              </Text>
            </AppCard>
          ) : (
            visits.map((visit, index) => (
              <AppCard key={visit.id || index} style={styles.visitCard}>
                <View style={styles.visitHeader}>
                  <View style={[styles.visitNumberBubble, { backgroundColor: `${theme.colors.primary}12` }]}>
                    <Wrench size={12} color={theme.colors.primary} />
                    <Text style={[styles.visitNumberText, { color: theme.colors.primary }]}>
                      Visit #{visit.visitNumber}
                    </Text>
                  </View>
                  <AppBadge
                    label={visitStatusLabel(visit.status)}
                    variant={visitStatusVariant(visit.status)}
                  />
                </View>

                {visit.scheduledDate ? (
                  <View style={styles.visitRow}>
                    <Calendar size={13} color={theme.colors.textMuted} />
                    <Text style={[styles.visitLabel, { color: theme.colors.textMuted }]}>Scheduled Date</Text>
                    <Text style={[styles.visitValue, { color: theme.colors.text }]}>
                      {formatDate(visit.scheduledDate)}
                    </Text>
                  </View>
                ) : null}

                {visit.ticket ? (
                  <>
                    <View style={styles.visitRow}>
                      <ClipboardList size={13} color={theme.colors.textMuted} />
                      <Text style={[styles.visitLabel, { color: theme.colors.textMuted }]}>Ticket Number</Text>
                      <Text style={[styles.visitValue, { color: theme.colors.primary }]}>
                        {visit.ticket.ticketNumber}
                      </Text>
                    </View>
                    <View style={styles.visitRow}>
                      <Info size={13} color={theme.colors.textMuted} />
                      <Text style={[styles.visitLabel, { color: theme.colors.textMuted }]}>Ticket Status</Text>
                      <Text style={[styles.visitValue, { color: theme.colors.text }]}>
                        {visit.ticket.status}
                      </Text>
                    </View>
                  </>
                ) : null}

                {visit.notes ? (
                  <View style={styles.visitNotesContainer}>
                    <Text style={[styles.visitNotesLabel, { color: theme.colors.textMuted }]}>Notes:</Text>
                    <Text style={[styles.visitNotes, { color: theme.colors.text }]}>
                      {visit.notes}
                    </Text>
                  </View>
                ) : null}
              </AppCard>
            ))
          )}
        </View>

        {/* ── Feature 2: Cancel Request button ── */}
        {(sub.status === "PENDING_APPROVAL" || sub.status === "PAYMENT_PENDING") && (
          <AppButton
            title="Cancel Request"
            variant="danger"
            onPress={() => {
              setCancelReason("");
              setCancelValidationError("");
              setCancelDialogVisible(true);
            }}
            style={styles.cancelRequestBtn}
          />
        )}

        {/* Spacer */}
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Cancellation confirmation modal dialog */}
      <Modal
        visible={cancelDialogVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCancelDialogVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setCancelDialogVisible(false)}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: theme.colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Cancel AMC Request
            </Text>
            <Text style={[styles.modalMessage, { color: theme.colors.textMuted }]}>
              Are you sure you want to cancel this AMC request?
            </Text>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: theme.colors.textMuted }]}>Reason *</Text>
              <TextInput
                style={[
                  styles.reasonInput,
                  {
                    color: theme.colors.text,
                    borderColor: cancelValidationError ? theme.colors.danger : theme.colors.borderLight,
                  },
                ]}
                placeholder="Enter the reason for cancelling this request"
                placeholderTextColor={theme.colors.textMuted}
                multiline
                numberOfLines={3}
                value={cancelReason}
                onChangeText={(text) => {
                  setCancelReason(text);
                  if (text.trim()) setCancelValidationError("");
                }}
              />
              {cancelValidationError ? (
                <Text style={[styles.validationErrorText, { color: theme.colors.danger }]}>
                  {cancelValidationError}
                </Text>
              ) : null}
            </View>

            <View style={styles.modalButtonsRow}>
              <AppButton
                title="Cancel"
                variant="ghost"
                onPress={() => setCancelDialogVisible(false)}
                style={styles.modalBtn}
                textStyle={{ color: theme.colors.textMuted }}
                disabled={cancelMutation.isPending}
              />
              <AppButton
                title="Confirm"
                variant="danger"
                onPress={async () => {
                  if (!cancelReason.trim()) {
                    setCancelValidationError("Reason is required.");
                    return;
                  }
                  setCancelValidationError("");

                  try {
                    await cancelMutation.mutateAsync({
                      subscriptionId: sub.id,
                      reason: cancelReason.trim(),
                    });
                    setCancelDialogVisible(false);
                    setSuccessVisible(true);
                  } catch (err: any) {
                    const serverMsg = err?.response?.data?.message || err?.message || "Failed to cancel request.";
                    setCancelValidationError(serverMsg);
                  }
                }}
                style={styles.modalBtn}
                loading={cancelMutation.isPending}
                disabled={cancelMutation.isPending}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Cancellation success prompt popup */}
      <CustomerPopup
        visible={successVisible}
        type="success"
        title="Success"
        message="The AMC request has been cancelled successfully."
        confirmText="OK"
        onConfirm={() => {
          setSuccessVisible(false);
          navigation.navigate("MyAmc");
        }}
      />
    </View>
  );
};

// ─────────────────────────── styles ─────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16 },

  // Summary card
  card: { marginBottom: 16, borderRadius: 12, overflow: "hidden", padding: 0 },
  cardStrip: { height: 4, width: "100%" },
  cardBody: { padding: 16 },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  planTitle: { fontSize: 18, fontWeight: "700" },
  statusRow: { marginTop: 4, flexDirection: "row" },

  headerPlanWrap: { marginBottom: 12 },
  statsCardWrap: { marginBottom: 16 },

  // Section styling
  sectionContainer: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, marginLeft: 4 },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(79, 111, 232, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  planDescription: { fontSize: 12, lineHeight: 17, marginTop: 10, paddingHorizontal: 4 },

  detailsCard: { padding: 16, borderRadius: 14, borderWidth: 1, borderColor: "rgba(15, 23, 42, 0.06)" },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  infoLabel: { fontSize: 13, flex: 1, marginLeft: 8 },
  infoValue: { fontSize: 13, fontWeight: "500" },

  // Coverage block styling
  coverageBlock: {
    marginBottom: 12,
  },
  coverageLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  coverageValue: {
    fontSize: 13,
    lineHeight: 18,
  },

  // Visit card styling
  visitCard: { marginBottom: 12, borderRadius: 12, padding: 16 },
  visitHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  visitNumberBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  visitNumberText: { fontSize: 12, fontWeight: "700" },
  visitRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  visitLabel: { fontSize: 12, flex: 1, marginLeft: 8 },
  visitValue: { fontSize: 12, fontWeight: "500" },
  visitNotesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  visitNotesLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
  visitNotes: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  emptyVisitsText: {
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 12,
  },

  // Cancel request button
  cancelRequestBtn: {
    marginTop: 12,
    height: 48,
    borderRadius: 10,
  },

  // Confirmation Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  modalMessage: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  inputContainer: {
    width: "100%",
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },
  reasonInput: {
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    minHeight: 80,
    textAlignVertical: "top",
  },
  validationErrorText: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 4,
    marginLeft: 2,
  },
  modalButtonsRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
  },
});

export default AmcDetailsScreen;
