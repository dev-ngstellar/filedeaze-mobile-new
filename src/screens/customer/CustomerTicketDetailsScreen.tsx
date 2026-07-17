import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Linking, Alert, Modal, Pressable } from "react-native";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Phone,
  Calendar,
  MapPin,
  User,
  Clock,
  X,
  Star,
  HelpCircle,
  PlusCircle,
  UserCheck,
  Wrench,
  CheckCircle2,
  XCircle,
  ShieldCheck,
} from "lucide-react-native";

import { useTheme } from "../../theme";
import { CustomerStackParamList } from "../../types/navigation.types";
import { useCustomerTicketDetails, useCancelCustomerTicket } from "../../hooks/useCustomer";
import { AppHeader } from "../../components/AppHeader";
import { AppLoader } from "../../components/AppLoader";
import { AppBadge } from "../../components/AppBadge";
import { AppButton } from "../../components/AppButton";
import { AppInput } from "../../components/AppInput";
import { PaymentSummaryCard } from "../../components/warranty/PaymentSummaryCard";

type NavigationProp = NativeStackNavigationProp<CustomerStackParamList, "CustomerTicketDetails">;
type RouteProps = RouteProp<CustomerStackParamList, "CustomerTicketDetails">;

export const CustomerTicketDetailsScreen = () => {
  const theme = useTheme();
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const { ticketId } = route.params;

  const { data: ticket, isLoading, refetch } = useCustomerTicketDetails(ticketId, { refetchInterval: 5000 });
  const cancelTicketMutation = useCancelCustomerTicket();

  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [cancelAttempted, setCancelAttempted] = useState(false);

  const openPhone = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <AppHeader showBack onBackPress={() => navigation.goBack()} title="Ticket Details" />
        <AppLoader message="Retrieving details..." />
      </View>
    );
  }

  if (!ticket) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <AppHeader showBack onBackPress={() => navigation.goBack()} title="Ticket Details" />
        <View style={styles.errorContent}>
          <Text style={{ color: theme.colors.textMuted }}>Ticket not found.</Text>
        </View>
      </View>
    );
  }

  const getStatusBadgeProps = (status: string) => {
    switch (status) {
      case "NEW_TICKET":
        return { label: "NEW", variant: "primary" as const };
      case "ASSIGNED":
        return { label: "ASSIGNED", variant: "warning" as const };
      case "ACCEPTED":
        return { label: "ACCEPTED", variant: "warning" as const };
      case "TRAVELLING":
        return { label: "EN ROUTE", variant: "warning" as const };
      case "REACHED":
      case "REACHED_LOCATION":
        return { label: "ARRIVED", variant: "warning" as const };
      case "IN_PROGRESS":
        return { label: "IN PROGRESS", variant: "warning" as const };
      case "COMPLETED":
        return { label: "COMPLETED", variant: "success" as const };
      case "INVOICE_GENERATED":
        return { label: "INVOICE GENERATED", variant: "success" as const };
      case "TICKET_CLOSED":
      case "CLOSED":
        return { label: "CLOSED", variant: "success" as const };
      case "CANCELLED":
        return { label: "CANCELLED", variant: "danger" as const };
      default:
        return { label: status, variant: "primary" as const };
    }
  };

  const badgeProps = getStatusBadgeProps(ticket.status);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "NEW_TICKET":
        return PlusCircle;
      case "ASSIGNED":
      case "ACCEPTED":
        return UserCheck;
      case "TRAVELLING":
      case "REACHED":
      case "REACHED_LOCATION":
        return MapPin;
      case "IN_PROGRESS":
        return Wrench;
      case "COMPLETED":
      case "INVOICE_GENERATED":
      case "TICKET_CLOSED":
      case "CLOSED":
        return CheckCircle2;
      case "CANCELLED":
        return XCircle;
      default:
        return HelpCircle;
    }
  };

  const getStatusColor = (status: string) => {
    return theme.colors.primary;
  };

  // Conditions
  const isCancelled = ticket.status === "CANCELLED";
  const isCancellable = ["NEW_TICKET", "ASSIGNED", "ACCEPTED"].includes(ticket.status);
  const isTrackable = ["TRAVELLING", "REACHED_LOCATION", "IN_PROGRESS", "COMPLETED", "INVOICE_GENERATED", "TICKET_CLOSED", "CLOSED"].includes(ticket.status);
  const isClosed = ["COMPLETED", "INVOICE_GENERATED", "TICKET_CLOSED", "CLOSED"].includes(ticket.status);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return d.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const handleCancelSubmit = async () => {
    setCancelAttempted(true);
    if (!cancelReason.trim()) {
      setCancelError("Reason is required");
      return;
    }

    try {
      await cancelTicketMutation.mutateAsync({ id: ticket.id, reason: cancelReason });
      Alert.alert("Cancelled", "Your service request has been cancelled successfully.");
      setCancelModalVisible(false);
      setCancelReason("");
      refetch();
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to cancel ticket");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader showBack onBackPress={() => navigation.goBack()} title="Ticket Details" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Ticket Title Card */}
        <View style={[styles.premiumCard, { backgroundColor: theme.colors.card }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Text style={[styles.cardHeaderLabel, { color: theme.colors.primary }]}>#{ticket.ticketNumber}</Text>
            </View>
            <AppBadge label={badgeProps.label} variant={badgeProps.variant} />
          </View>
          <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={2}>
            {ticket.subCategory?.name || "—"}
          </Text>
          <Text style={[styles.desc, { color: theme.colors.textMuted }]}>
            {ticket.description}
          </Text>
        </View>

        {/* Cancellation notice */}
        {isCancelled && (
          <View style={[styles.cancelledBanner, { backgroundColor: `${theme.colors.danger}0d`, borderColor: `${theme.colors.danger}30` }]}>
            <XCircle size={18} color={theme.colors.danger} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.cancelledBannerTitle, { color: theme.colors.danger }]}>Ticket Cancelled</Text>
              <Text style={[styles.cancelledBannerSub, { color: theme.colors.textMuted }]}>
                This service request has been cancelled. Assigned expert, schedule, and site details have been cleared.
              </Text>
            </View>
          </View>
        )}

        {/* Assigned Technician Profile */}
        {!isCancelled && (
        <><Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>Assigned Technician</Text>
        <View style={[styles.premiumCard, { backgroundColor: theme.colors.card }]}>
          {ticket.technician ? (
            <View style={styles.techRow}>
              <View style={[styles.techAvatarPlaceholder, { backgroundColor: `${theme.colors.primary}12` }]}>
                <Text style={[styles.avatarInitials, { color: theme.colors.primary }]}>
                  {ticket.technician.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={styles.techText}>
                <Text style={[styles.techName, { color: theme.colors.text }]}>{ticket.technician.name}</Text>
                <Text style={[styles.techRole, { color: theme.colors.textMuted, marginTop: 2 }]}>
                  Field Technician • {ticket.technician.phone}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.techRow}>
              <View style={[styles.techAvatarPlaceholder, { backgroundColor: `${theme.colors.borderLight}` }]}>
                <HelpCircle color={theme.colors.textMuted} size={22} />
              </View>
              <View style={styles.techText}>
                <Text style={[styles.techName, { color: theme.colors.textMuted }]}>Assigning Soon...</Text>
                <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 2 }}>
                  We are assigning the best technician for you
                </Text>
              </View>
            </View>
          )}

          {ticket.technician && (
            <>
              <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />
              <View style={styles.techActionBox}>
                <Text style={{ fontSize: 13, color: theme.colors.textMuted, flex: 1 }}>
                  Contact dispatch desk:
                </Text>
                <Pressable
                  style={[styles.callButton, { backgroundColor: `${theme.colors.primary}12` }]}
                  onPress={() => openPhone(ticket.technician!.phone)}
                >
                  <Phone size={14} color={theme.colors.primary} style={{ marginRight: 6 }} />
                  <Text style={[styles.callButtonText, { color: theme.colors.primary }]}>Call Technician</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>

        {/* Scheduled date card */}
        <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>Schedule & Site</Text>
        <View style={[styles.premiumCard, { backgroundColor: theme.colors.card }]}>
          <View style={styles.infoRow}>
            <View style={[styles.iconContainer, { backgroundColor: `${theme.colors.primary}12` }]}>
              <Calendar size={18} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: theme.colors.textMuted, textTransform: "uppercase", fontWeight: "700", letterSpacing: 0.5, marginBottom: 2 }}>Scheduled Date</Text>
              <Text style={[styles.infoVal, { color: theme.colors.text, fontWeight: "700" }]}>{formatDate(ticket.scheduledAt)}</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

          <View style={styles.infoRow}>
            <View style={[styles.iconContainer, { backgroundColor: `${theme.colors.primary}12` }]}>
              <MapPin size={18} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: theme.colors.textMuted, textTransform: "uppercase", fontWeight: "700", letterSpacing: 0.5, marginBottom: 2 }}>Service Address</Text>
              <Text style={[styles.infoVal, { color: theme.colors.text, fontWeight: "500", lineHeight: 18 }]}>
                {ticket.serviceAddress || "—"}
              </Text>
            </View>
          </View>
        </View>
        </>
        )}

        {/* Payment Summary — only when the ticket has actually been invoiced */}
        {isClosed && ticket.invoice && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>Payment Summary</Text>
            <View style={[styles.premiumCard, { backgroundColor: theme.colors.card }]}>
              <View style={styles.infoRow}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: theme.colors.textMuted, textTransform: "uppercase", fontWeight: "700", letterSpacing: 0.5 }}>Invoice Number</Text>
                  <Text style={[styles.infoVal, { color: theme.colors.text, fontWeight: "700", marginTop: 2 }]}>{ticket.invoice.invoiceNumber}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontSize: 11, color: theme.colors.textMuted, textTransform: "uppercase", fontWeight: "700", letterSpacing: 0.5 }}>Invoice Date</Text>
                  <Text style={[styles.infoVal, { color: theme.colors.text, fontWeight: "700", marginTop: 2 }]}>{formatDate(ticket.invoice.generatedAt)}</Text>
                </View>
              </View>
              {ticket.payment && (
                <View style={[styles.infoRow, { marginTop: 12 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: theme.colors.textMuted, textTransform: "uppercase", fontWeight: "700", letterSpacing: 0.5 }}>Payment Method</Text>
                    <Text style={[styles.infoVal, { color: theme.colors.text, fontWeight: "700", marginTop: 2 }]}>{ticket.payment.method}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ fontSize: 11, color: theme.colors.textMuted, textTransform: "uppercase", fontWeight: "700", letterSpacing: 0.5 }}>Payment Status</Text>
                    <Text style={[styles.infoVal, { color: theme.colors.success, fontWeight: "700", marginTop: 2 }]}>{ticket.payment.status}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* warrantyPartsValue is never persisted on the Invoice/Payment records — only the
                live technician preview / just-collected response have it — so it's correctly
                omitted here rather than fabricated. */}
            <PaymentSummaryCard
              serviceCharge={ticket.invoice.serviceCharge}
              serviceChargeWaived={ticket.payment?.serviceChargeWaived}
              labourCharge={ticket.invoice.labourCharge}
              labourChargeWaived={ticket.payment?.labourChargeWaived}
              sparePartsAmount={ticket.invoice.sparePartsAmount}
              additionalCharge={ticket.invoice.additionalCharge}
              discount={ticket.invoice.discount}
              subtotal={ticket.invoice.subtotal}
              gstPercent={ticket.invoice.gstPercent}
              gstAmount={ticket.invoice.gstAmount}
              grandTotal={ticket.invoice.total}
            />
            <View style={{ height: 16 }} />
          </>
        )}

        {/* Feedback Section (if completed) */}
        {isClosed && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>Service Feedback</Text>
            <View style={[styles.premiumCard, { backgroundColor: theme.colors.card }]}>
              {ticket.feedback ? (
                <View style={styles.feedbackShow}>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={18}
                        color={star <= ticket.feedback!.rating ? theme.colors.warning : theme.colors.textLight}
                        fill={star <= ticket.feedback!.rating ? theme.colors.warning : "transparent"}
                      />
                    ))}
                  </View>
                  <Text style={{ color: theme.colors.text, fontSize: 14, marginTop: 8, fontStyle: "italic" }}>
                    "{ticket.feedback.review}"
                  </Text>
                </View>
              ) : (
                <AppButton
                  title="Submit Feedback"
                  onPress={() => navigation.navigate("Feedback", { ticketId: ticket.id, ticketNumber: ticket.ticketNumber })}
                />
              )}
            </View>
          </>
        )}

        {/* Timeline Status History */}
        <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>Status Timeline</Text>

        <View style={[styles.premiumCard, { backgroundColor: theme.colors.card, paddingVertical: 20 }]}>
          {ticket.statusLogs && ticket.statusLogs.length > 0 ? (
            ticket.statusLogs.map((log, index) => {
              const isLast = index === ticket.statusLogs.length - 1;
              const subProps = getStatusBadgeProps(log.status);
              const StatusIcon = getStatusIcon(log.status);
              const statusColor = getStatusColor(log.status);

              return (
                <View key={log.id} style={styles.timelineItem}>
                  <View style={styles.timelineIndicator}>
                    <View style={[
                      styles.timelineDotContainer,
                      {
                        backgroundColor: `${theme.colors.primary}12`,
                        borderColor: isLast ? theme.colors.primary : `${theme.colors.primary}40`,
                        borderWidth: isLast ? 2 : 1.5,
                      }
                    ]}>
                      <StatusIcon size={12} color={theme.colors.primary} />
                    </View>
                    {!isLast && <View style={[styles.timelineLine, { backgroundColor: theme.colors.primary }]} />}
                  </View>

                  <View style={styles.timelineContent}>
                    <View style={styles.timelineHeader}>
                      <Text style={[styles.timelineStatusText, { color: theme.colors.primary, fontWeight: "700" }]}>
                        {subProps.label}
                      </Text>
                      <View style={styles.timeWrapper}>
                        <Clock size={11} color={theme.colors.textMuted} style={{ marginRight: 3 }} />
                        <Text style={{ fontSize: 11, color: theme.colors.textMuted }}>
                          {formatDate(log.changedAt)}
                        </Text>
                      </View>
                    </View>
                    {log.notes && (
                      <Text style={{ fontSize: 12, color: theme.colors.textMuted, marginTop: 4, lineHeight: 16 }}>
                        {log.notes}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })
          ) : (
            <View style={{ alignItems: "center", paddingVertical: 24 }}>
              <Clock size={28} color={theme.colors.textLight} />
              <Text style={{ fontSize: 13, color: theme.colors.textMuted, marginTop: 8 }}>
                No status history available yet.
              </Text>
            </View>
          )}
        </View>

        {/* Cancellation and Track Live actions */}
        <View style={styles.actionContainer}>
          {isTrackable && (
            <AppButton
              title="Track Live"
              onPress={() => navigation.navigate("LiveTracking", {
                ticketId: ticket.id,
                ticketNumber: ticket.ticketNumber,
                hasFeedback: !!ticket.feedback,
              })}
              style={{ marginBottom: 10 }}
            />
          )}

          {isCancellable && (
            <AppButton
              title="Cancel Ticket"
              variant="outline"
              onPress={() => setCancelModalVisible(true)}
              style={{ borderColor: theme.colors.danger }}
              textStyle={{ color: theme.colors.danger }}
            />
          )}
        </View>
      </ScrollView>

      {/* Cancel Ticket Reason Modal */}
      <Modal visible={cancelModalVisible} transparent animationType="fade" onRequestClose={() => setCancelModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Cancel Ticket</Text>
              <Pressable onPress={() => setCancelModalVisible(false)}>
                <X size={20} color={theme.colors.textMuted} />
              </Pressable>
            </View>

            <View style={{ padding: 16 }}>
              <View style={styles.labelRow}>
                <Text style={[styles.formLabel, { color: theme.colors.textMuted }]}>Reason for Cancellation</Text>
                <Text style={{ color: theme.colors.danger, fontWeight: "bold" }}> *</Text>
              </View>
              <AppInput
                placeholder="Enter cancellation reason..."
                value={cancelReason}
                onChangeText={(val) => {
                  setCancelReason(val);
                  if (cancelError) setCancelError("");
                }}
                multiline
                numberOfLines={3}
              />
              {cancelAttempted && cancelError ? (
                <Text style={[styles.errorText, { color: theme.colors.danger }]}>{cancelError}</Text>
              ) : null}

              <AppButton
                title="Confirm Cancellation"
                onPress={handleCancelSubmit}
                disabled={!cancelReason.trim()}
                loading={cancelTicketMutation.isPending}
                style={{ marginTop: 16 }}
                variant="danger"
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  premiumCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flex: 1,
    marginRight: 8,
  },
  cardHeaderLabel: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    lineHeight: 22,
  },
  desc: {
    fontSize: 14,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 10,
    marginTop: 6,
    paddingLeft: 4,
  },
  techRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  techAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: "800",
  },
  techText: {
    flex: 1,
  },
  techName: {
    fontSize: 15,
    fontWeight: "700",
  },
  techRole: {
    fontSize: 12,
    marginTop: 2,
  },
  techActionBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  callButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  callButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  infoVal: {
    fontSize: 14,
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  timelineItem: {
    flexDirection: "row",
    minHeight: 65,
    paddingHorizontal: 4,
  },
  timelineIndicator: {
    width: 28,
    alignItems: "center",
  },
  timelineDotContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    zIndex: 2,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
    zIndex: 1,
  },
  timelineContent: {
    flex: 1,
    marginLeft: 10,
    paddingBottom: 16,
  },
  timelineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timelineStatusText: {
    fontSize: 13,
  },
  timeWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionContainer: {
    marginTop: 12,
  },
  errorContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  formLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  feedbackShow: {
    alignItems: "center",
    paddingVertical: 8,
  },
  starsRow: {
    flexDirection: "row",
    gap: 4,
  },
  cancelledBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  cancelledBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 3,
  },
  cancelledBannerSub: {
    fontSize: 12,
    lineHeight: 17,
  },
});

export default CustomerTicketDetailsScreen;
