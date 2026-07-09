import React, { useEffect, useRef } from "react";
import { View, StyleSheet, ViewStyle, Animated, Easing } from "react-native";
import {
  Car,
  UserRound,
  ClipboardList,
  CalendarSync,
  LoaderCircle,
  Check,
  ThumbsUp,
  MapPin,
  Ticket,
  X,
  Ban,
  ThumbsDown,
  CreditCard,
  ArrowUpRight,
  Receipt,
} from "lucide-react-native";
import { TicketStatus } from "../services/job.service";
import { useTheme } from "../theme";

interface StatusBadgeProps {
  status: TicketStatus;
  paymentCollection?: number;
  style?: ViewStyle;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, paymentCollection, style }) => {
  const theme = useTheme();
  const colors = theme.colors;

  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let anim: Animated.CompositeAnimation;

    if (status === "TRAVELLING") {
      // Bounce animation (only for Travelling)
      anim = Animated.loop(
        Animated.sequence([
          Animated.timing(animValue, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(animValue, { toValue: 0, duration: 400, useNativeDriver: true }),
        ])
      );
    } else if (status === "IN_PROGRESS") {
      // Continuous spin (only for In Progress)
      animValue.setValue(0);
      anim = Animated.loop(
        Animated.timing(animValue, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
    } else {
      // No animation for other states
      animValue.setValue(0);
      return;
    }

    anim.start();
    return () => anim.stop();
  }, [status]);

  const getTransformStyle = () => {
    if (status === "TRAVELLING") {
      const translateY = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -4],
      });
      return { transform: [{ translateY }] };
    } else if (status === "IN_PROGRESS") {
      const rotate = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "360deg"],
      });
      return { transform: [{ rotate }] };
    }
    return {};
  };

  let Icon = Ticket;
  let color = "#64748B";
  let bgColor = "#F1F5F9";

  switch (status) {
    case "NEW_TICKET":
      Icon = Ticket;
      color = "#64748B";
      bgColor = "#F1F5F9";
      break;
    case "ASSIGNED":
      Icon = UserRound;
      color = "#3B82F6";
      bgColor = "#EFF6FF";
      break;
    case "ACCEPTED":
      Icon = ThumbsUp;
      color = "#3B82F6";
      bgColor = "#EFF6FF";
      break;
    case "TRAVELLING":
      Icon = Car;
      color = "#EA580C";
      bgColor = "#FFF7ED";
      break;
    case "REACHED_LOCATION":
      Icon = MapPin;
      color = "#3B82F6";
      bgColor = "#EFF6FF";
      break;
    case "IN_PROGRESS":
      Icon = LoaderCircle;
      color = "#16A34A";
      bgColor = "#F0FDF4";
      break;
    case "PENDING":
      Icon = ClipboardList;
      color = "#D97706";
      bgColor = "#FEF3C7";
      break;
    case "RESCHEDULED":
      Icon = CalendarSync;
      color = "#7C3AED";
      bgColor = "#F5F3FF";
      break;
    case "COMPLETED":
      Icon = Check;
      color = "#FFFFFF";
      bgColor = "#16A34A"; // Solid green background
      break;
    case "TICKET_CLOSED":
      Icon = Check;
      color = "#FFFFFF";
      bgColor = "#475569"; // Solid slate gray background
      break;
    case "INVOICE_GENERATED" as any:
      Icon = Receipt;
      color = "#16A34A";
      bgColor = "#F0FDF4"; // Light green Payment badge
      break;
    default:
      // Map other states (like Cancelled / Rejected)
      if (status === "CANCELLED") {
        Icon = Ban;
        color = "#DC2626";
        bgColor = "#FEF2F2";
      } else if ((status as string) === "REJECTED") {
        Icon = ThumbsDown;
        color = "#DC2626";
        bgColor = "#FEF2F2";
      } else {
        Icon = X;
        color = "#DC2626";
        bgColor = "#FEF2F2";
      }
      break;
  }

  return (
    <View style={[styles.container, { backgroundColor: bgColor }, style]}>
      <Animated.View style={getTransformStyle()}>
        {status === "ASSIGNED" ? (
          <View style={{ width: 18, height: 18, justifyContent: "center", alignItems: "center" }}>
            <UserRound color={color} size={16} style={{ marginRight: 2 }} />
            <ArrowUpRight
              color={color}
              size={10}
              strokeWidth={3.5}
              style={{ position: "absolute", bottom: -2, right: -2 }}
            />
          </View>
        ) : (
          <Icon color={color} size={18} />
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
});

