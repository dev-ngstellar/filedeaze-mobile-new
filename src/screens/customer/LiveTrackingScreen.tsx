import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Linking,
  ScrollView,
  Animated,
  Easing,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  MapPin,
  Clock,
  User,
  Phone,
  RefreshCw,
  Navigation2,
  CheckCircle2,
  Ticket,
  Star,
  ShieldCheck,
  Compass,
  Zap,
  Plus,
  Minus,
} from "lucide-react-native";
import Svg, { Path, Circle, Line, Rect } from "react-native-svg";
import { useTheme } from "../../theme";
import { useTrackCustomerTicket, useSubmitCustomerFeedback, useCustomerTicketDetails } from "../../hooks/useCustomer";
import { CustomerStackParamList } from "../../types/navigation.types";
import { AppHeader } from "../../components/AppHeader";
import { AppLoader } from "../../components/AppLoader";
import { AppButton } from "../../components/AppButton";
import { AppInput } from "../../components/AppInput";

type NavigationProp = NativeStackNavigationProp<CustomerStackParamList, "LiveTracking">;
type RouteProps = RouteProp<CustomerStackParamList, "LiveTracking">;

// ─── Journey step definition ────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "En Route",     statuses: ["TRAVELLING", "REACHED", "REACHED_LOCATION", "IN_PROGRESS", "COMPLETED", "INVOICE_GENERATED", "TICKET_CLOSED", "CLOSED"], icon: Navigation2 },
  { id: 2, label: "Arrived",      statuses: ["REACHED", "REACHED_LOCATION", "IN_PROGRESS", "COMPLETED", "INVOICE_GENERATED", "TICKET_CLOSED", "CLOSED"], icon: MapPin },
  { id: 3, label: "In Progress",  statuses: ["IN_PROGRESS", "COMPLETED", "INVOICE_GENERATED", "TICKET_CLOSED", "CLOSED"], icon: Clock },
  { id: 4, label: "Completed",    statuses: ["COMPLETED", "INVOICE_GENERATED", "TICKET_CLOSED", "CLOSED"], icon: CheckCircle2 },
];

// ─── Status display helpers ──────────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  TRAVELLING:       "En Route to Site",
  REACHED:          "Technician Arrived",
  REACHED_LOCATION: "Technician Arrived",
  IN_PROGRESS:      "Work in Progress",
  COMPLETED:        "Service Completed",
  INVOICE_GENERATED:"Invoice Generated",
  TICKET_CLOSED:    "Ticket Closed",
  CLOSED:           "Ticket Closed",
};

const STATUS_DESCRIPTION: Record<string, string> = {
  TRAVELLING:       "Technician is currently heading to your location.",
  REACHED:          "Technician has reached your site and will start soon.",
  REACHED_LOCATION: "Technician has reached your site and will start soon.",
  IN_PROGRESS:      "Work is actively underway to resolve your issue.",
  COMPLETED:        "Service has been completed successfully.",
  INVOICE_GENERATED:"Service completed and invoice has been generated.",
  TICKET_CLOSED:    "This ticket has been resolved and closed.",
  CLOSED:           "This ticket has been resolved and closed.",
};

// ─── Active progress width per status ───────────────────────────────────────
const progressWidth = (status: string) => {
  if (status === "COMPLETED" || status === "INVOICE_GENERATED" || status === "TICKET_CLOSED" || status === "CLOSED") return "100%";
  if (status === "IN_PROGRESS")      return "66%";
  if (status === "REACHED" || status === "REACHED_LOCATION") return "33%";
  if (status === "TRAVELLING")       return "10%";
  return "0%";
};

// ─── Custom Pulsing Marker Component ─────────────────────────────────────────
const PulsingMarker = ({ color, icon: Icon, label }: { color: string; icon?: any; label: string }) => {
  const pulseValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = () => {
      pulseValue.setValue(0);
      Animated.timing(pulseValue, {
        toValue: 1,
        duration: 2000,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start(() => pulse());
    };
    pulse();
  }, [pulseValue]);

  const scale = pulseValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.5],
  });

  const opacity = pulseValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 0],
  });

  return (
    <View style={styles.markerContainer}>
      <Animated.View
        style={[
          styles.pulseRing,
          {
            backgroundColor: color,
            transform: [{ scale }],
            opacity,
          },
        ]}
      />
      <View style={[styles.markerDot, { backgroundColor: color }]}>
        {Icon ? <Icon size={12} color="#ffffff" /> : <View style={styles.markerInnerDot} />}
      </View>
      <View style={[styles.markerLabel, { backgroundColor: color }]}>
        <Text style={styles.markerLabelText}>{label}</Text>
      </View>
    </View>
  );
};

export const LiveTrackingScreen = () => {
  const theme = useTheme();
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const { ticketId, ticketNumber, hasFeedback } = route.params;

  const { data: tracking, isLoading, refetch, isFetching } =
    useTrackCustomerTicket(ticketId, { refetchInterval: 5_000 });

  const { data: ticketDetails } = useCustomerTicketDetails(ticketId);
  const ticketHasFeedback = !!ticketDetails?.feedback || !!hasFeedback;

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <AppHeader showBack onBackPress={() => navigation.goBack()} title="Live Tracking" />
        <AppLoader message="Connecting to technician GPS..." />
      </View>
    );
  }

  const tech   = tracking?.technician;
  const status = tracking?.status || "TRAVELLING";
  const displayStatus = STATUS_LABEL[status] || status.replace(/_/g, " ");
  const statusDesc = STATUS_DESCRIPTION[status] || "Updating progress details...";

  // ETA calculation
  const techLat    = tech?.currentLat ?? 28.615;
  const techLng    = tech?.currentLng ?? 77.208;
  const custLat    = 28.6139;
  const custLng    = 77.209;
  const latDiff    = Math.abs(techLat - custLat);
  const lngDiff    = Math.abs(techLng - custLng);
  const distanceKm = Math.max(0.2, parseFloat(((latDiff + lngDiff) * 111).toFixed(1)));
  const etaMinutes = Math.max(1, Math.round(distanceKm * 2.5));

  // Status color
  const isCompleted = ["COMPLETED", "INVOICE_GENERATED", "TICKET_CLOSED", "CLOSED"].includes(status);
  const statusColor = isCompleted ? theme.colors.success : theme.colors.primary;

  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [hasShownFeedback, setHasShownFeedback] = useState(false);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const submitFeedbackMutation = useSubmitCustomerFeedback();

  useEffect(() => {
    if (isCompleted && !hasShownFeedback && !ticketHasFeedback) {
      setFeedbackVisible(true);
      setHasShownFeedback(true);
    }
  }, [isCompleted, hasShownFeedback, ticketHasFeedback]);

  const handleFeedbackSubmit = async () => {
    if (rating === 0) {
      Alert.alert("Rating Required", "Please choose a star rating.");
      return;
    }
    if (!review.trim()) {
      Alert.alert("Review Required", "Please write a review comment.");
      return;
    }
    setSubmittingFeedback(true);
    try {
      await submitFeedbackMutation.mutateAsync({
        ticketId,
        rating,
        review,
      });
      setFeedbackVisible(false);
      Alert.alert("Thank You!", "Thank you for your feedback.", [
        {
          text: "OK",
          onPress: () => {
            navigation.reset({
              index: 0,
              routes: [{ name: "CustomerDashboard" }],
            });
          },
        },
      ]);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to submit feedback");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleCall = () => {
    if (tech?.phone) Linking.openURL(`tel:${tech.phone}`);
  };

  const initials = tech?.name
    ? tech.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
    : "—";

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        showBack
        onBackPress={() => navigation.goBack()}
        title="Live Tracking"
        rightAction={
          <Pressable onPress={() => refetch()} style={styles.refreshBtn}>
            <RefreshCw
              size={18}
              color={isFetching ? theme.colors.primary : theme.colors.textMuted}
            />
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Ticket Info Hero Card ─────────────────────────────────────── */}
        <View style={[styles.heroCard, { backgroundColor: theme.colors.card }]}>
          <View style={styles.heroLeft}>
            <View style={styles.heroTicketRow}>
              <Ticket size={14} color={theme.colors.primary} />
              <Text style={[styles.heroTicketLabel, { color: theme.colors.textMuted }]}>
                Ticket Number
              </Text>
            </View>
            <Text style={[styles.heroTicketNum, { color: theme.colors.text }]}>
              {ticketNumber ? `#${ticketNumber}` : `#${ticketId.slice(-8).toUpperCase()}`}
            </Text>
            <View style={[styles.statusPill, { backgroundColor: `${statusColor}10`, borderColor: `${statusColor}30` }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusPillText, { color: statusColor }]}>
                {displayStatus}
              </Text>
            </View>
          </View>

          <View style={[styles.heroVertDivider, { backgroundColor: theme.colors.borderLight }]} />

          <View style={styles.heroRight}>
            <View style={styles.heroMetric}>
              <Clock size={16} color={theme.colors.primary} />
              <View>
                <Text style={[styles.heroMetricLabel, { color: theme.colors.textMuted }]}>ETA</Text>
                <Text style={[styles.heroMetricVal, { color: theme.colors.text }]}>{etaMinutes} min</Text>
              </View>
            </View>
            <View style={[styles.heroDividerH, { backgroundColor: theme.colors.borderLight }]} />
            <View style={styles.heroMetric}>
              <MapPin size={16} color={theme.colors.primary} />
              <View>
                <Text style={[styles.heroMetricLabel, { color: theme.colors.textMuted }]}>Distance</Text>
                <Text style={[styles.heroMetricVal, { color: theme.colors.text }]}>{distanceKm} km</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Map Area ─────────────────────────────────────────────────── */}
        <View style={[styles.mapCard, { backgroundColor: theme.colors.card }]}>
          <View style={styles.mapLabelRow}>
            <Compass size={14} color={theme.colors.primary} />
            <Text style={[styles.mapLabel, { color: theme.colors.textMuted }]}>
              Real-Time Route Map
            </Text>
            {isFetching && (
              <Text style={{ fontSize: 10, color: theme.colors.primary, marginLeft: "auto", fontWeight: "600" }}>
                Updating GPS...
              </Text>
            )}
          </View>

          <View style={styles.svgWrapper}>
            <Svg height="100%" width="100%" viewBox="0 0 400 300">
              <Rect x="0" y="0" width="400" height="300" fill="#f8fafc" />
              <Line x1="40" y1="0" x2="40" y2="300" stroke="#f1f5f9" strokeWidth="1" />
              <Line x1="80" y1="0" x2="80" y2="300" stroke="#f1f5f9" strokeWidth="1" />
              <Line x1="120" y1="0" x2="120" y2="300" stroke="#f1f5f9" strokeWidth="1" />
              <Line x1="160" y1="0" x2="160" y2="300" stroke="#f1f5f9" strokeWidth="1" />
              <Line x1="200" y1="0" x2="200" y2="300" stroke="#f1f5f9" strokeWidth="1" />
              <Line x1="240" y1="0" x2="240" y2="300" stroke="#f1f5f9" strokeWidth="1" />
              <Line x1="280" y1="0" x2="280" y2="300" stroke="#f1f5f9" strokeWidth="1" />
              <Line x1="320" y1="0" x2="320" y2="300" stroke="#f1f5f9" strokeWidth="1" />
              <Line x1="360" y1="0" x2="360" y2="300" stroke="#f1f5f9" strokeWidth="1" />
              <Line x1="0" y1="40" x2="400" y2="40" stroke="#f1f5f9" strokeWidth="1" />
              <Line x1="0" y1="80" x2="400" y2="80" stroke="#f1f5f9" strokeWidth="1" />
              <Line x1="0" y1="120" x2="400" y2="120" stroke="#f1f5f9" strokeWidth="1" />
              <Line x1="0" y1="160" x2="400" y2="160" stroke="#f1f5f9" strokeWidth="1" />
              <Line x1="0" y1="200" x2="400" y2="200" stroke="#f1f5f9" strokeWidth="1" />
              <Line x1="0" y1="240" x2="400" y2="240" stroke="#f1f5f9" strokeWidth="1" />
              <Line x1="0" y1="280" x2="400" y2="280" stroke="#f1f5f9" strokeWidth="1" />
              <Path
                d="M-20 80 Q 80 50 150 120 T 320 180 T 420 220"
                fill="none"
                stroke="#e0f2fe"
                strokeWidth="24"
                strokeLinecap="round"
                opacity="0.8"
              />
              <Path
                d="M-20 80 Q 80 50 150 120 T 320 180 T 420 220"
                fill="none"
                stroke="#bae6fd"
                strokeWidth="16"
                strokeLinecap="round"
                opacity="0.5"
              />
              <Path
                d="M 230 20 C 280 10, 350 30, 360 80 C 370 120, 310 130, 270 120 C 230 110, 200 60, 230 20 Z"
                fill="#f0fdf4"
                stroke="#dcfce7"
                strokeWidth="2"
                opacity="0.9"
              />
              <Path
                d="M 20 180 C 60 170, 110 190, 120 220 C 130 250, 80 280, 50 270 C 20 260, 10 210, 20 180 Z"
                fill="#f0fdf4"
                stroke="#dcfce7"
                strokeWidth="2"
                opacity="0.9"
              />
              <Rect x="0" y="130" width="400" height="24" fill="#e2e8f0" rx="3" />
              <Rect x="60" y="0" width="18" height="300" fill="#e2e8f0" rx="3" />
              <Rect x="320" y="0" width="18" height="300" fill="#e2e8f0" rx="3" />
              <Rect x="185" y="0" width="18" height="300" fill="#e2e8f0" rx="3" />
              <Rect x="0" y="240" width="400" height="16" fill="#e2e8f0" rx="3" />
              <Line x1="0" y1="142" x2="400" y2="142" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="8,6" />
              <Line x1="69" y1="0" x2="69" y2="300" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="8,6" />
              <Line x1="329" y1="0" x2="329" y2="300" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="8,6" />
              <Line x1="194" y1="0" x2="194" y2="300" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="8,6" />
              <Rect x="95" y="15" width="80" height="100" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" rx="6" />
              <Rect x="105" y="25" width="28" height="35" fill="#f8fafc" rx="3" />
              <Rect x="139" y="25" width="28" height="35" fill="#f8fafc" rx="3" />
              <Rect x="105" y="70" width="62" height="35" fill="#f8fafc" rx="3" />
              <Rect x="220" y="15" width="80" height="100" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" rx="6" />
              <Rect x="230" y="25" width="60" height="35" fill="#f8fafc" rx="3" />
              <Rect x="230" y="70" width="28" height="35" fill="#f8fafc" rx="3" />
              <Rect x="264" y="70" width="28" height="35" fill="#f8fafc" rx="3" />
              <Rect x="95" y="170" width="80" height="60" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" rx="6" />
              <Rect x="220" y="170" width="80" height="60" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" rx="6" />
              <Path
                d="M 69 40 L 69 142 L 329 142 L 329 248"
                fill="none"
                stroke={theme.colors.primary}
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.2"
              />
              <Path
                d="M 69 40 L 69 142 L 329 142 L 329 248"
                fill="none"
                stroke={theme.colors.primary}
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
<View style={[styles.markerWrapper, { left: "17.25%", top: "13.33%" }]}>
              <PulsingMarker color={theme.colors.primary} icon={Navigation2} label="Technician" />
            </View>

            <View style={[styles.markerWrapper, { left: "82.25%", top: "82.66%" }]}>
              <PulsingMarker color={theme.colors.success} icon={MapPin} label="You" />
            </View>

            {/* GPS Live Badge */}
            <View style={styles.gpsPulseBadge}>
              <View style={[styles.gpsBadgeDot, { backgroundColor: theme.colors.success }]} />
              <Text style={styles.gpsBadgeText}>GPS Live</Text>
            </View>

            {/* Floating Map Controls */}
            <View style={styles.mapControls}>
              <Pressable style={styles.mapControlBtn} onPress={() => Alert.alert("Zoom In", "Zooming in on location...")}>
                <Plus size={14} color={theme.colors.textMuted} />
              </Pressable>
              <View style={[styles.controlDivider, { backgroundColor: theme.colors.borderLight }]} />
              <Pressable style={styles.mapControlBtn} onPress={() => Alert.alert("Zoom Out", "Zooming out...")}>
                <Minus size={14} color={theme.colors.textMuted} />
              </Pressable>
            </View>

            <Pressable style={styles.mapCenterBtn} onPress={() => Alert.alert("Recenter", "Recenter map on your technician...")}>
              <Compass size={16} color={theme.colors.primary} />
            </Pressable>
          </View>

          <View style={[styles.statusBanner, { backgroundColor: `${theme.colors.primary}08` }]}>
            <Zap size={14} color={theme.colors.primary} />
            <Text style={[styles.statusBannerText, { color: theme.colors.text }]} numberOfLines={2}>
              {statusDesc}
            </Text>
          </View>
        </View>

        {/* ── Journey Progress ──────────────────────────────────────────── */}
        <View style={[styles.journeyCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.journeyTitle, { color: theme.colors.textMuted }]}>
            Service Journey
          </Text>

          <View style={styles.progressTrack}>
            <View style={[styles.trackBg, { backgroundColor: theme.colors.borderLight }]} />
            <View
              style={[
                styles.trackFill,
                { backgroundColor: theme.colors.primary, width: progressWidth(status) },
              ]}
            />

            {STEPS.map((step, idx) => {
              const isActive = step.statuses.includes(status);
              const isCurrent = status === step.statuses[0];
              const leftPercent = (idx / (STEPS.length - 1)) * 100;
              const StepIcon = step.icon;

              return (
                <View
                  key={step.id}
                  style={[styles.stepNode, { left: `${leftPercent}%` as any }]}
                >
                  <View
                    style={[
                      styles.stepCircle,
                      isActive
                        ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                        : { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                      isCurrent && {
                        borderColor: theme.colors.primary,
                        shadowColor: theme.colors.primary,
                        shadowOpacity: 0.4,
                        shadowRadius: 6,
                        elevation: 4,
                      }
                    ]}
                  >
                    <StepIcon size={12} color={isActive ? "#ffffff" : theme.colors.textMuted} />
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      { color: isActive ? theme.colors.primary : theme.colors.textMuted },
                      isCurrent && { fontWeight: "800" },
                    ]}
                    numberOfLines={1}
                  >
                    {step.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Service Feedback Notice Card */}
        {isCompleted && !ticketHasFeedback && (
          <View style={[styles.feedbackNoticeCard, { backgroundColor: `${theme.colors.warning}10`, borderColor: theme.colors.warning }]}>
            <View style={styles.feedbackNoticeHeader}>
              <Star size={20} color={theme.colors.warning} fill={theme.colors.warning} />
              <Text style={[styles.feedbackNoticeTitle, { color: theme.colors.text }]}>
                Share Your Feedback
              </Text>
            </View>
            <Text style={[styles.feedbackNoticeDesc, { color: theme.colors.textMuted }]}>
              Your service is completed! Please take a moment to rate and review your experience with the technician.
            </Text>
            <Pressable
              style={[styles.feedbackNoticeBtn, { backgroundColor: theme.colors.warning }]}
              onPress={() => setFeedbackVisible(true)}
            >
              <Text style={styles.feedbackNoticeBtnText}>Submit Feedback</Text>
            </Pressable>
          </View>
        )}

        {/* ── Technician Card ───────────────────────────────────────────── */}
        {tech ? (
          <View style={[styles.techCard, { backgroundColor: theme.colors.card }]}>
            <View style={styles.techLeft}>
              <View style={[styles.techAvatar, { backgroundColor: `${theme.colors.primary}12` }]}>
                <Text style={[styles.techInitials, { color: theme.colors.primary }]}>{initials}</Text>
              </View>
              <View style={styles.techInfo}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={[styles.techName, { color: theme.colors.text }]} numberOfLines={1}>
                    {tech.name}
                  </Text>
                  <View style={[styles.verifiedBadge, { backgroundColor: `${theme.colors.success}12` }]}>
                    <ShieldCheck size={11} color={theme.colors.success} />
                    <Text style={[styles.verifiedText, { color: theme.colors.success }]}>Verified</Text>
                  </View>
                </View>
                <Text style={[styles.techRole, { color: theme.colors.textMuted }]}>
                  Field Technician • {tech.phone}
                </Text>
                {tech.rating ? (
                  <View style={styles.ratingRow}>
                    <Star size={11} color={theme.colors.warning} fill={theme.colors.warning} />
                    <Text style={[styles.ratingText, { color: theme.colors.textMuted }]}>
                      {tech.rating.toFixed(1)} Rating
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            <Pressable
              style={[styles.callBtn, { backgroundColor: theme.colors.primary }]}
              onPress={handleCall}
            >
              <Phone size={14} color="#ffffff" />
              <Text style={styles.callBtnText}>Call</Text>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.techCard, { backgroundColor: theme.colors.card }]}>
            <View style={styles.techLeft}>
              <View style={[styles.techAvatar, { backgroundColor: theme.colors.borderLight }]}>
                <User size={20} color={theme.colors.textLight} />
              </View>
              <View style={styles.techInfo}>
                <Text style={[styles.techName, { color: theme.colors.textLight }]}>
                  Assigning Technician...
                </Text>
                <Text style={[styles.techRole, { color: theme.colors.textLight }]}>
                  We'll notify you once assigned
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Feedback Modal Popup */}
      <Modal
        visible={feedbackVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setFeedbackVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setFeedbackVisible(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: theme.colors.card }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Service Feedback</Text>
            <Text style={[styles.modalSubtitle, { color: theme.colors.textMuted }]}>
              Please rate your service satisfaction.
            </Text>

            {/* Stars row */}
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => {
                const isSelected = star <= rating;
                return (
                  <Pressable
                    key={star}
                    onPress={() => setRating(star)}
                    style={styles.starBtn}
                  >
                    <Star
                      size={32}
                      color={isSelected ? theme.colors.warning : theme.colors.textLight}
                      fill={isSelected ? theme.colors.warning : "transparent"}
                    />
                  </Pressable>
                );
              })}
            </View>

            <AppInput
              placeholder="Share details about your experience. Was the technician polite? Was the issue resolved?"
              value={review}
              onChangeText={setReview}
              multiline
              numberOfLines={4}
            />

            <View style={styles.modalBtnRow}>
              <AppButton
                title="Cancel"
                variant="ghost"
                onPress={() => setFeedbackVisible(false)}
                style={{ flex: 1 }}
                textStyle={{ color: theme.colors.textMuted }}
              />
              <AppButton
                title="Submit"
                onPress={handleFeedbackSubmit}
                loading={submittingFeedback}
                disabled={rating === 0 || !review.trim()}
                style={{ flex: 1.5 }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  refreshBtn: {
    padding: 8,
  },

  // ── Hero card ────────────────────────────────────────────────────────────
  heroCard: {
    borderRadius: 16,
    flexDirection: "row",
    padding: 18,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  heroLeft: {
    flex: 1,
    justifyContent: "center",
    gap: 6,
  },
  heroTicketRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  heroTicketLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroTicketNum: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  heroVertDivider: {
    width: 1,
    marginHorizontal: 16,
    borderRadius: 2,
  },
  heroRight: {
    justifyContent: "center",
    gap: 10,
  },
  heroMetric: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  heroMetricLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  heroMetricVal: {
    fontSize: 16,
    fontWeight: "800",
  },
  heroDividerH: {
    height: 1,
    borderRadius: 2,
  },

  // ── Map ──────────────────────────────────────────────────────────────────
  mapCard: {
    borderRadius: 16,
    padding: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  mapLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  mapLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  svgWrapper: {
    height: 220,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },

  // ── Animated markers ─────────────────────────────────────────────────────
  markerWrapper: {
    position: "absolute",
    marginLeft: -25,
    marginTop: -25,
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  markerContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  markerDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  markerInnerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#ffffff",
  },
  markerLabel: {
    position: "absolute",
    top: -20,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  markerLabelText: {
    fontSize: 8,
    fontWeight: "800",
    color: "#ffffff",
    textTransform: "uppercase",
  },

  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  statusBannerText: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },

  // ── Journey stepper ──────────────────────────────────────────────────────
  journeyCard: {
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  journeyTitle: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 24,
  },
  progressTrack: {
    position: "relative",
    height: 60,
    marginBottom: 8,
    marginHorizontal: 14,
  },
  trackBg: {
    position: "absolute",
    top: 14,
    left: 0,
    right: 0,
    height: 4,
    borderRadius: 2,
    zIndex: 1,
  },
  trackFill: {
    position: "absolute",
    top: 14,
    left: 0,
    height: 4,
    borderRadius: 2,
    zIndex: 2,
  },
  stepNode: {
    position: "absolute",
    alignItems: "center",
    zIndex: 3,
    width: 60,
    marginLeft: -30,
    top: 0,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  stepLabel: {
    fontSize: 9,
    fontWeight: "700",
    marginTop: 6,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  // ── Technician card ──────────────────────────────────────────────────────
  techCard: {
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  techLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  techAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  techInitials: {
    fontSize: 18,
    fontWeight: "800",
  },
  techInfo: {
    flex: 1,
    gap: 2,
  },
  techName: {
    fontSize: 15,
    fontWeight: "700",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 9,
    fontWeight: "700",
  },
  techRole: {
    fontSize: 12,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: "600",
  },
  callBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  callBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  gpsPulseBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  gpsBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  gpsBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0f172a",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  mapControls: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  mapControlBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  controlDivider: {
    height: 1,
    width: "100%",
  },
  mapCenterBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    borderRadius: 16,
    padding: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginVertical: 12,
  },
  starBtn: {
    padding: 4,
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  feedbackNoticeCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  feedbackNoticeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  feedbackNoticeTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  feedbackNoticeDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  feedbackNoticeBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  feedbackNoticeBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
});

export default LiveTrackingScreen;
