import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Linking, Alert, Modal, Pressable } from "react-native";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Phone,
  Calendar,
  MapPin,
  Clock,
  X,
  Star,
  HelpCircle,
  PlusCircle,
  UserCheck,
  Wrench,
  CheckCircle2,
  XCircle,
  MessageSquare,
} from "lucide-react-native";

import { useTheme } from "../../theme";
import { CustomerStackParamList } from "../../types/navigation.types";
import { useCustomerTicketDetails, useCancelCustomerTicket, useSubmitCustomerFeedback } from "../../hooks/useCustomer";
import { AppHeader } from "../../components/AppHeader";
import { AppLoader } from "../../components/AppLoader";
import { AppBadge } from "../../components/AppBadge";
import { AppButton } from "../../components/AppButton";
import { AppInput } from "../../components/AppInput";
import { PaymentSummaryCard } from "../../components/warranty/PaymentSummaryCard";

type NavigationProp = NativeStackNavigationProp<CustomerStackParamList, "CustomerTicketDetails">;
type RouteProps = RouteProp<CustomerStackParamList, "CustomerTicketDetails">;

const RATING_LABELS: Record<number, string> = {
  5: "Excellent Service",
  4: "Good",
  3: "Average",
  2: "Poor",
  1: "Very Poor",
  0: "Tap a star to rate",
};

export const CustomerTicketDetailsScreen = () => {
  const theme = useTheme();
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const { ticketId } = route.params;

  const { data: ticket, isLoading, refetch } = useCustomerTicketDetails(ticketId, { refetchInterval: 5000 });
  const cancelTicketMutation = useCancelCustomerTicket();
  const submitFeedbackMutation = useSubmitCustomerFeedback();

  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [cancelAttempted, setCancelAttempted] = useState(false);

  // Inline Feedback State
  const [feedbackRating, setFeedbackRating] = useState<number>(0);
  const [feedbackReview, setFeedbackReview] = useState("");
  const [feedbackAttempted, setFeedbackAttempted] = useState(false);
  const [feedbackRatingError, setFeedbackRatingError] = useState("");
  const [feedbackReviewError, setFeedbackReviewError] = useState("");

  const openPhone = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleInlineFeedbackSubmit = async () => {
    if (!ticket) return;
    setFeedbackAttempted(true);
    let hasError = false;

    if (feedbackRating === 0) {
      setFeedbackRatingError("Please select a star rating.");
      hasError = true;
    } else {
      setFeedbackRatingError("");
    }

    if (!feedbackReview.trim()) {
      setFeedbackReviewError("Please enter your feedback description.");
      hasError = true;
    } else {
      setFeedbackReviewError("");
    }

    if (hasError) return;

    try {
      await submitFeedbackMutation.mutateAsync({
        ticketId: ticket.id,
        rating: feedbackRating,
        review: feedbackReview.trim(),
      });
      Alert.alert("Thank You!", "Your feedback has been submitted successfully.");
      refetch();
    } catch (err: any) {
      Alert.alert("Submission Failed", "We couldn't submit your feedback. Please try again.");
    }
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

  const handleConfirmCancel = async () => {
    setCancelAttempted(true);
    if (!cancelReason.trim()) {
      setCancelError("Reason is required");
      return;
    }

    try {
      await cancelTicketMutation.mutateAsync({ id: ticket.id, reason: cancelReason });
      Alert.alert("Ticket Cancelled", "Your service request has been cancelled.");
      setCancelModalVisible(false);
      setCancelReason("");
      refetch();
    } catch (err: any) {
      Alert.alert("Cancellation Failed", "We couldn't cancel your request. Please try again.");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader showBack onBackPress={() => navigation.goBack()} title="Ticket Details" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 1. Ticket Details */}
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

        {/* 2. Assigned Technician */}
        {!isCancelled && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>Assigned Technician</Text>
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

            {/* 3. Schedule & Site */}
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

        {/* 4. Status Timeline */}
        <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>Status Timeline</Text>

        <View style={[styles.premiumCard, { backgroundColor: theme.colors.card, paddingVertical: 20 }]}>
          {(() => {
            const filteredLogs = (ticket.statusLogs || []).filter(
              (log) => log.status !== "SERVICE_FEEDBACK" && log.status !== "FEEDBACK"
            );
            if (filteredLogs.length === 0) {
              return (
                <View style={{ alignItems: "center", paddingVertical: 24 }}>
                  <Clock size={28} color={theme.colors.textLight} />
                  <Text style={{ fontSize: 13, color: theme.colors.textMuted, marginTop: 8 }}>
                    No status history available yet.
                  </Text>
                </View>
              );
            }
            return filteredLogs.map((log, index) => {
              const isLast = index === filteredLogs.length - 1;
              const subProps = getStatusBadgeProps(log.status);
              const StatusIcon = getStatusIcon(log.status);

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
            });
          })()}
        </View>

        {/* 5. Standalone Completion & Service Feedback Card */}
        {isClosed && (
          <View style={[styles.completionCard, { backgroundColor: theme.colors.card, borderColor: `${theme.colors.success}30` }]}>
            <View style={styles.completionBannerHeader}>
              <View style={[styles.successIconBadge, { backgroundColor: `${theme.colors.success}15` }]}>
                <CheckCircle2 size={24} color={theme.colors.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.completionTitle, { color: theme.colors.text }]}>
                  🎉 Service Completed Successfully
                </Text>
                <Text style={{ fontSize: 12, color: theme.colors.textMuted, marginTop: 2 }}>
                  Your service request has been completed.
                </Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.colors.borderLight, marginVertical: 12 }]} />

            {ticket.feedback ? (
              <View style={styles.submittedFeedbackBox}>
                <View style={[styles.submittedBadgeRow, { backgroundColor: `${theme.colors.success}12` }]}>
                  <CheckCircle2 size={15} color={theme.colors.success} />
                  <Text style={{ color: theme.colors.success, fontWeight: "700", fontSize: 13 }}>
                    Thank you for your feedback!
                  </Text>
                </View>

                <View style={[styles.starsRow, { gap: 6, marginTop: 10, justifyContent: "center" }]}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={22}
                      color={star <= ticket.feedback!.rating ? theme.colors.primary : theme.colors.borderLight}
                      fill={star <= ticket.feedback!.rating ? theme.colors.primary : "transparent"}
                    />
                  ))}
                </View>

                <Text style={{ color: theme.colors.primary, fontWeight: "700", fontSize: 13, marginTop: 6, textAlign: "center" }}>
                  Your Rating: {RATING_LABELS[ticket.feedback.rating] || "Service Rated"}
                </Text>

                {ticket.feedback.review ? (
                  <Text style={{ color: theme.colors.text, fontSize: 13, marginTop: 8, fontStyle: "italic", textAlign: "center", lineHeight: 18 }}>
                    "{ticket.feedback.review}"
                  </Text>
                ) : null}
              </View>
            ) : (
              <View style={styles.unsubmittedFeedbackBox}>
                <Text style={{ fontSize: 13, color: theme.colors.textMuted, lineHeight: 18, marginBottom: 12 }}>
                  We'd love to hear about your experience. Your feedback helps us continuously improve our service quality.
                </Text>

                {/* Star Selection */}
                <Text style={{ fontSize: 12, fontWeight: "700", color: theme.colors.text, marginBottom: 6 }}>
                  Rate Technician & Service <Text style={{ color: theme.colors.danger }}>*</Text>
                </Text>
                <View style={{ flexDirection: "row", justifyContent: "center", gap: 12, paddingVertical: 4 }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Pressable
                      key={star}
                      onPress={() => {
                        setFeedbackRating(star);
                        if (feedbackRatingError) setFeedbackRatingError("");
                      }}
                      hitSlop={6}
                    >
                      <Star
                        size={32}
                        color={star <= feedbackRating ? theme.colors.primary : theme.colors.borderLight}
                        fill={star <= feedbackRating ? theme.colors.primary : "transparent"}
                      />
                    </Pressable>
                  ))}
                </View>
                {feedbackRating > 0 && (
                  <Text style={{ textAlign: "center", fontSize: 12, fontWeight: "700", color: theme.colors.primary, marginTop: 4 }}>
                    {RATING_LABELS[feedbackRating]}
                  </Text>
                )}
                {feedbackAttempted && feedbackRatingError ? (
                  <Text style={{ color: theme.colors.danger, fontSize: 12, textAlign: "center", marginTop: 4 }}>
                    {feedbackRatingError}
                  </Text>
                ) : null}

                {/* Feedback Review Description */}
                <Text style={{ fontSize: 12, fontWeight: "700", color: theme.colors.text, marginTop: 12, marginBottom: 6 }}>
                  Comments & Review <Text style={{ color: theme.colors.danger }}>*</Text>
                </Text>
                <AppInput
                  placeholder="Share details about your service experience..."
                  value={feedbackReview}
                  onChangeText={(val) => {
                    setFeedbackReview(val);
                    if (feedbackReviewError) setFeedbackReviewError("");
                  }}
                  multiline
                  numberOfLines={3}
                  style={{ minHeight: 70 }}
                />
                {feedbackAttempted && feedbackReviewError ? (
                  <Text style={{ color: theme.colors.danger, fontSize: 12, marginTop: 4 }}>
                    {feedbackReviewError}
                  </Text>
                ) : null}

                {/* Primary Full-Width Action Button */}
                <AppButton
                  title="Rate & Review Service"
                  onPress={handleInlineFeedbackSubmit}
                  loading={submitFeedbackMutation.isPending}
                  disabled={feedbackRating === 0 || !feedbackReview.trim()}
                  style={{ marginTop: 14 }}
                  variant="primary"
                />
              </View>
            )}
          </View>
        )}

        {/* 6. Payment Summary & Invoice (placed below Service Feedback) */}
        {isClosed && ticket.invoice && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>Payment Summary & Invoice</Text>
            <PaymentSummaryCard
              invoiceNumber={ticket.invoice.invoiceNumber}
              ticketNumber={ticket.ticketNumber}
              invoiceDate={formatDate(ticket.invoice.generatedAt)}
              paymentMode={ticket.payment?.method}
              paymentStatus={ticket.payment?.status}
              serviceCharge={ticket.invoice.serviceCharge}
              serviceChargeWaived={ticket.payment?.serviceChargeWaived}
              labourCharge={ticket.invoice.labourCharge}
              labourChargeWaived={ticket.payment?.labourChargeWaived}
              sparePartsAmount={ticket.invoice.sparePartsAmount}
              warrantyPartsValue={(ticket.invoice as any)?.warrantyPartsValue ?? (ticket.payment as any)?.warrantyPartsValue}
              additionalCharge={ticket.invoice.additionalCharge}
              discount={ticket.invoice.discount}
              subtotal={ticket.invoice.subtotal}
              gstPercent={ticket.invoice.gstPercent}
              gstAmount={ticket.invoice.gstAmount}
              grandTotal={ticket.invoice.total}
            />
          </>
        )}

        {/* Cancellation action */}
        <View style={styles.actionContainer}>
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
                onPress={handleConfirmCancel}
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
  completionCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  completionBannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  successIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  completionTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  submittedFeedbackBox: {
    alignItems: "center",
    paddingVertical: 6,
  },
  submittedBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  unsubmittedFeedbackBox: {
    marginTop: 2,
  },
});

export default CustomerTicketDetailsScreen;
