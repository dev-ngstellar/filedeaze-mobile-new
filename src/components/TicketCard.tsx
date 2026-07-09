import React from "react";
import { View, Text, StyleSheet, Pressable, ViewStyle, Linking, Alert, Animated } from "react-native";
import { User, MapPin, Calendar, ChevronRight, Phone, Briefcase } from "lucide-react-native";
import { useTheme } from "../theme";
import { Ticket, TicketStatus } from "../services/job.service";
import { StatusBadge } from "./StatusBadge";
import { PriorityBadge } from "./PriorityBadge";
import { AppConfirmModal } from "./AppConfirmModal";

interface TicketCardProps {
  ticket: Ticket;
  onPress: () => void;
  style?: ViewStyle;
}

export const TicketCard: React.FC<TicketCardProps> = ({ ticket, onPress, style }) => {
  const theme = useTheme();
  const pulseAnim = React.useRef(new Animated.Value(0.3)).current;
  const [modalVisible, setModalVisible] = React.useState(false);

  React.useEffect(() => {
    if (ticket.status === "ACCEPTED") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [ticket.status]);

  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case "COMPLETED":
      case "TICKET_CLOSED":
      case "ACCEPTED":
        return theme.colors.success;
      case "IN_PROGRESS":
        return theme.colors.purple;
      case "TRAVELLING":
      case "REACHED_LOCATION":
        return theme.colors.primary;
      case "PENDING":
      case "RESCHEDULED":
        return theme.colors.amber;
      default:
        // ASSIGNED, NEW
        return theme.colors.primary;
    }
  };

  const statusColor = getStatusColor(ticket.status);

  const handleCall = () => {
    if (ticket.customerMobile) {
      Linking.openURL(`tel:${ticket.customerMobile}`).catch(() => {
        Alert.alert("Error", "Could not place phone call.");
      });
    }
  };

  const handleStartJob = () => {
    // Navigate or call onPress
    onPress();
  };

  let isLocked = false;
  let lockMessage = "";
  if (ticket.createdAt && (ticket.status === "ASSIGNED" || ticket.status === "PENDING" || ticket.status === "NEW_TICKET")) {
    const raisedTime = new Date(ticket.createdAt).getTime();
    const currentTime = Date.now();
    const hoursDifference = (currentTime - raisedTime) / (1000 * 60 * 60);
    if (hoursDifference > 48) {
      isLocked = true;
      lockMessage = "Time Expired: You can only accept a ticket within 48 hours of it being raised.";
    }
  }

  const handlePress = () => {
    if (isLocked) {
      setModalVisible(true);
      return;
    }
    onPress();
  };

  // Determine CTA text based on status
  const ctaText = isLocked
    ? `Locked (Time Expired)`
    : ticket.status === "ASSIGNED" || ticket.status === "NEW_TICKET"
    ? "View Details"
    : ticket.status === "ACCEPTED"
    ? "Start Travel"
    : ticket.status === "TRAVELLING"
    ? "Mark Reached"
    : ticket.status === "REACHED_LOCATION"
    ? "Start Job"
    : ticket.status === "IN_PROGRESS"
    ? "Update Status"
    : ((ticket.status as string) === "INVOICE_GENERATED" || (ticket.status as string) === "TICKET_CLOSED")
    ? "View Invoice Details"
    : "View Details";

  return (
    <View
      style={[
        styles.cardContainer,
        {
          backgroundColor: theme.colors.card,
          shadowColor: theme.colors.shadow,
          borderColor: theme.colors.borderLight,
          opacity: isLocked ? 0.6 : 1,
        },
        style,
      ]}
    >
      {/* Left colored status indicator strip */}
      <View style={[styles.statusStrip, { backgroundColor: statusColor }]} />

      {/* Main card content */}
      <View style={styles.cardContent}>
        {/* Top Header Row */}
        <View style={styles.headerRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={[styles.ticketNo, { color: theme.colors.textMuted }]}>{ticket.ticketNo}</Text>
            {ticket.status === "ACCEPTED" && (
              <Animated.View
                style={[
                  styles.blinkingDot,
                  {
                    opacity: pulseAnim,
                    backgroundColor: theme.colors.success,
                  },
                ]}
              />
            )}
          </View>
        </View>

        {/* Ticket Service / Title Row */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <Text style={[styles.title, { color: theme.colors.text, flex: 1, marginRight: 8 }]} numberOfLines={1}>
            {ticket.service}
          </Text>
          <StatusBadge status={ticket.status} paymentCollection={ticket.paymentCollection} />
        </View>

        {/* Category & Service Type */}
        {ticket.category && (
          <View style={styles.categoryRow}>
            <Briefcase size={12} color={theme.colors.textLight} />
            <Text style={[styles.categoryText, { color: theme.colors.textMuted }]}>
              {ticket.category}
            </Text>
          </View>
        )}

        {/* Ticket Description */}
        {ticket.description ? (
          <Text style={[styles.description, { color: theme.colors.textMuted }]} numberOfLines={2}>
            {ticket.description}
          </Text>
        ) : null}

        {/* Divider & Customer/Meta Rows - only displayed for accepted/active tickets */}
        {ticket.status !== "ASSIGNED" && ticket.status !== "NEW_TICKET" && (
          <>
            <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

            {/* Customer & Call Row */}
            <View style={styles.customerRow}>
              <View style={styles.customerInfo}>
                <View style={[styles.avatarCircle, { backgroundColor: `${theme.colors.primary}08` }]}>
                  <User size={14} color={theme.colors.primary} />
                </View>
                <View style={styles.customerDetails}>
                  <Text style={[styles.customerName, { color: theme.colors.text }]}>
                    {ticket.customerName}
                  </Text>
                  {ticket.customerMobile && (
                    <Text style={[styles.customerPhone, { color: theme.colors.textMuted }]}>
                      {ticket.customerMobile}
                    </Text>
                  )}
                </View>
              </View>
              {ticket.customerMobile && (
                <Pressable
                  onPress={handleCall}
                  style={({ pressed }) => [
                    styles.callButton,
                    { backgroundColor: `${theme.colors.success}10` },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Phone size={14} color={theme.colors.success} />
                </Pressable>
              )}
            </View>

            {/* Schedule & Location */}
            <View style={styles.metaSection}>
              <View style={styles.metaRow}>
                <Calendar size={14} color={theme.colors.textLight} />
                <Text style={[styles.metaText, { color: theme.colors.textMuted }]} numberOfLines={1}>
                  {ticket.scheduledDate} · {ticket.scheduledTime}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <MapPin size={14} color={theme.colors.textLight} />
                <Text style={[styles.metaText, { color: theme.colors.textMuted }]} numberOfLines={1}>
                  {ticket.address}
                </Text>
              </View>
            </View>
          </>
        )}

        {/* CTA Button */}
        <Pressable
          onPress={handlePress}
          style={({ pressed }) => [
            styles.ctaContainer,
            { borderTopColor: theme.colors.borderLight },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={[styles.ctaText, { color: theme.colors.primary }]}>{ctaText}</Text>
          <ChevronRight size={16} color={theme.colors.primary} />
        </Pressable>
      </View>
      <AppConfirmModal
        visible={modalVisible}
        title="Ticket Locked"
        message={`This ticket is scheduled for ${ticket.scheduledDate}. You cannot view or accept it until that date.`}
        confirmText="Close"
        confirmVariant="warning"
        showCancel={false}
        onConfirm={() => setModalVisible(false)}
        onCancel={() => setModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  cardPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.99 }],
  },
  statusStrip: {
    width: 6,
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  ticketNo: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "500",
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    marginBottom: 12,
  },
  customerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  customerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: 14,
    fontWeight: "600",
  },
  customerPhone: {
    fontSize: 12,
    marginTop: 1,
  },
  callButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  metaSection: {
    gap: 6,
    marginBottom: 14,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaText: {
    fontSize: 13,
    flex: 1,
  },
  ctaContainer: {
    borderTopWidth: 1,
    paddingTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ctaText: {
    fontSize: 13,
    fontWeight: "700",
  },
  blinkingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
