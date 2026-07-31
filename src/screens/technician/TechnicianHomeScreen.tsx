import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  LogOut,
  LogIn,
  History,
  MapPin,
  ChevronRight,
  ChevronLeft,
  User,
  Clock,
  CheckCircle,
  AlertTriangle,
  FileCheck,
  Timer,
  Calendar,
  Receipt,
  Briefcase,
  Bell,
} from "lucide-react-native";

import { useTheme } from "../../theme";
import { useAuthStore } from "../../store/auth.store";
import { useTechnicianJobs, useTechnicianInvoices, useAttendanceStatus, useCheckIn, useCheckOut } from "../../hooks/useJobs";
import { useUnreadNotificationCount } from "../../hooks/useNotifications";
import * as Location from "expo-location";
import { TicketStatus } from "../../services/job.service";
import { getFreshLocationForAttendance } from "../../utils/location";
import { TechnicianStackParamList } from "../../types/navigation.types";
import { AppLoader } from "../../components/AppLoader";
import { AppEmptyState } from "../../components/AppEmptyState";
import { AppCard } from "../../components/AppCard";
import { AppBadge } from "../../components/AppBadge";
import { AppButton } from "../../components/AppButton";
import { AppConfirmModal } from "../../components/AppConfirmModal";
import { AppSuccessModal } from "../../components/AppSuccessModal";

// Import new components
import { TicketCard } from "../../components/TicketCard";
import { JobOverviewCard } from "../../components/JobOverviewCard";
import { EmptyTicketsState } from "../../components/EmptyTicketsState";

type NavigationProp = NativeStackNavigationProp<TechnicianStackParamList, "TechnicianHome">;

export const TechnicianHomeScreen = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { user, logout } = useAuthStore();

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  };
  const firstName = user?.name?.split(" ")[0] || user?.name || "Technician";
  const { data: jobs = [], isLoading: isJobsLoading, isError, error, refetch, isRefetching } = useTechnicianJobs();
  const { data: invoices = [], isLoading: isInvoicesLoading, refetch: refetchInvoices, isRefetching: isRefetchingInvoices } = useTechnicianInvoices();
  const { data: attendance, isLoading: isAttendanceLoading, refetch: refetchAttendance, isRefetching: isRefetchingAttendance } = useAttendanceStatus();

  const checkInMutation = useCheckIn();
  const checkOutMutation = useCheckOut();
  const unreadNotifCount = useUnreadNotificationCount();

  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [locationInput, setLocationInput] = useState("");
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successTitle, setSuccessTitle] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [elapsedHours, setElapsedHours] = useState("0h 00m 00s");

  useEffect(() => {
    if (attendance) {
      console.log("=== TRACE STEP 4: TechnicianHomeScreen attendance state ===");
      console.log("HomeScreen Object:", JSON.stringify(attendance, null, 2));
      console.log("HomeScreen Values:", {
        checkInLocation: (attendance as any)?.checkInLocation,
        location: (attendance as any)?.location,
        checkInRemarks: (attendance as any)?.checkInRemarks,
        remarks: (attendance as any)?.remarks,
      });
      console.log("=== TRACE STEP 5: UI Render Value ===");
      console.log("UI render value for Physical Location:", (attendance as any)?.checkInLocation);
    }

    let intervalId: any;

    const updateTimer = () => {
      if (!attendance?.rawCheckInTime) {
        setElapsedHours("0h 00m 00s");
        return;
      }
      const checkInDate = new Date(attendance.rawCheckInTime);
      const currentDate = new Date();
      const diffMs = currentDate.getTime() - checkInDate.getTime();
      if (diffMs <= 0) {
        setElapsedHours("0h 00m 00s");
        return;
      }

      const totalSecs = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSecs / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      const secs = totalSecs % 60;

      setElapsedHours(`${hours}h ${String(mins).padStart(2, "0")}m ${String(secs).padStart(2, "0")}s`);
    };

    if (attendance?.checkedIn && attendance?.rawCheckInTime) {
      updateTimer();
      intervalId = setInterval(updateTimer, 1000);
    } else {
      setElapsedHours("0h 00m 00s");
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [attendance?.checkedIn, attendance?.rawCheckInTime, attendance]);

  const getMonthsList = () => {
    const list = [];
    const currentDate = new Date();
    // Add "All" option
    list.push({ label: "All", month: undefined, year: undefined });
    for (let i = 0; i < 6; i++) {
      const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      list.push({
        label,
        month: d.getMonth() + 1,
        year: d.getFullYear(),
      });
    }
    return list;
  };

  // Calculate statistics
  const jobsList = Array.isArray(jobs) ? jobs : [];
  const getTodayStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  const todayStr = getTodayStr();

  // 1. Ongoing tickets: active tickets scheduled for today (or earlier, since they are still active)
  const ongoing = jobsList.filter(
    (j) =>
      !["COMPLETED", "TICKET_CLOSED", "CANCELLED", "INVOICE_GENERATED"].includes(j.status as string) &&
      (!j.scheduledDateRaw || j.scheduledDateRaw <= todayStr)
  );

  // 2. Payment pending: invoice generated
  const paymentPending = jobsList.filter(
    (j) => (j.status as string) === "INVOICE_GENERATED"
  );

  // 3. Completed/Closed
  const completedTickets = (invoices || []).map((inv: any) => ({
    id: inv.ticketId,
    ticketNo: inv.ticket?.ticketNumber || inv.invoiceNumber,
    service: `Invoice: #${inv.invoiceNumber}`,
    status: "TICKET_CLOSED" as TicketStatus,
    customerName: inv.ticket?.customer?.name || "Client",
    customerMobile: "",
    description: `Payment Mode: ${inv.payment?.method || "N/A"}\nTotal Collected: ₹${inv.total}`,
    scheduledDate: inv.generatedAt 
      ? new Date(inv.generatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })
      : "—",
    scheduledTime: inv.generatedAt
      ? new Date(inv.generatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" })
      : "",
    address: "—",
    paymentCollection: Number(inv.total),
    paymentMethod: inv.payment?.method,
  }));

  // 4. Upcoming tickets: scheduled in the future
  const upcoming = jobsList.filter(
    (j) =>
      j.scheduledDateRaw && j.scheduledDateRaw > todayStr &&
      (j.status as string) !== "CANCELLED"
  );

  const activeTickets = Array.from(
    new Map(
      [...ongoing, ...paymentPending, ...completedTickets, ...upcoming].map((item) => [item.id, item])
    ).values()
  );
  const assignedCount = jobsList.filter((j) => j.status === "ASSIGNED" || j.status === "NEW_TICKET").length;
  const inProgressCount = jobsList.filter(
    (j) => j.status === "IN_PROGRESS" || j.status === "ACCEPTED" || j.status === "TRAVELLING" || j.status === "REACHED_LOCATION"
  ).length;
  const pendingCount = jobsList.filter((j) => j.status === "PENDING" || j.status === "RESCHEDULED").length;
  const completedCount = invoices.length;
  const completionRate = jobsList.length > 0 ? Math.round((completedCount / jobsList.length) * 100) : 0;

  const handleCheckInPress = () => {
    if (attendance?.shiftCompleted) {
      Alert.alert("Shift Completed", "Your shift for today has already been completed.");
      return;
    }
    if (attendance?.checkedIn) {
      Alert.alert("Already Checked In", "You are already checked in today.");
      return;
    }
    setLocationModalVisible(true);
  };

  const [isSubmittingAttendance, setIsSubmittingAttendance] = useState(false);

  const handleCheckInSubmit = async () => {
    if (isSubmittingAttendance || checkInMutation.isPending) return;
    if (attendance?.shiftCompleted) {
      Alert.alert("Shift Completed", "Your shift for today has already been completed.");
      return;
    }
    setIsSubmittingAttendance(true);
    try {
      const coords = await getFreshLocationForAttendance();

      let finalLocation = locationInput.trim();
      if (!finalLocation) {
        try {
          const geocoded = await Location.reverseGeocodeAsync({
            latitude: coords.latitude,
            longitude: coords.longitude,
          });
          if (geocoded && geocoded.length > 0) {
            const p = geocoded[0];
            const parts = [p.name, p.street, p.subregion || p.district, p.city, p.region].filter(Boolean);
            const uniqueParts = Array.from(new Set(parts));
            finalLocation = uniqueParts.join(", ");
          }
        } catch {
          // Reverse geocoding fallback
        }
      }

      if (!finalLocation) {
        finalLocation = `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
      }

      await checkInMutation.mutateAsync({
        location: finalLocation,
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
      setLocationModalVisible(false);
      setLocationInput("");
      setSuccessTitle("Checked In");
      setSuccessMessage("Attendance checked in successfully.");
      setSuccessModalVisible(true);
    } catch (err: any) {
      Alert.alert("Check-In Failed", "We couldn't record your check-in. Please check your location settings and try again.");
    } finally {
      setIsSubmittingAttendance(false);
    }
  };

  const handleCheckOutSubmit = async () => {
    if (!attendance?.checkedIn) {
      Alert.alert("Check-In Required", "You must check in first before recording check-out.");
      return;
    }
    setCheckoutModalVisible(true);
  };



  const getElapsedWorkingHours = () => {
    if (!attendance?.rawCheckInTime) return "0h 00m";
    const checkInDate = new Date(attendance.rawCheckInTime);
    const currentDate = new Date();
    const diffMs = currentDate.getTime() - checkInDate.getTime();
    if (diffMs <= 0) return "0h 00m";
    
    const totalMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${hours}h ${String(mins).padStart(2, "0")}m`;
  };

  const handleConfirmCheckOut = async () => {
    if (isSubmittingAttendance || checkOutMutation.isPending) return;
    setCheckoutModalVisible(false);
    setIsSubmittingAttendance(true);
    try {
      const coords = await getFreshLocationForAttendance();
      const res: any = await checkOutMutation.mutateAsync({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
      
      // Calculate working hours from backend response data
      let workingHoursStr = "N/A";
      const attendanceData = res?.data;
      if (attendanceData?.checkInTime && attendanceData?.checkOutTime) {
        const diffMs = new Date(attendanceData.checkOutTime).getTime() - new Date(attendanceData.checkInTime).getTime();
        const totalMins = Math.floor(diffMs / 60000);
        const h = Math.floor(totalMins / 60);
        const m = totalMins % 60;
        workingHoursStr = `${h}h ${String(m).padStart(2, "0")}m`;
      }

      setSuccessTitle("Checked Out");
      setSuccessMessage(`Successfully checked out.\nWorking hours today: ${workingHoursStr}`);
      setSuccessModalVisible(true);
    } catch (err: any) {
      Alert.alert("Check-Out Failed", "We couldn't record your check-out. Please check your location settings and try again.");
    } finally {
      setIsSubmittingAttendance(false);
    }
  };

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "danger";
      case "HIGH":
        return "warning";
      case "MEDIUM":
        return "primary";
      default:
        return "secondary";
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "COMPLETED":
      case "TICKET_CLOSED":
        return "success";
      case "IN_PROGRESS":
      case "ACCEPTED":
      case "TRAVELLING":
      case "REACHED_LOCATION":
        return "warning";
      case "PENDING":
      case "RESCHEDULED":
        return "danger";
      default:
        return "primary";
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Hero Section */}
      <View
        style={[
          styles.heroSection,
          { backgroundColor: theme.colors.primary, paddingTop: insets.top + 16 },
        ]}
      >
        {/* Top Row: Avatar + Name + Actions */}
        <View style={styles.heroTopRow}>
          <View style={[styles.heroAvatar, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
            <User color="#ffffff" size={22} />
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.heroDashLabel}>TECHNICIAN DASHBOARD</Text>
            <Text style={styles.heroName}>{getGreeting()}, {firstName}!</Text>
            <Text style={styles.heroMobile}>{user?.mobile}</Text>
          </View>
          <View style={styles.heroActions}>
            <Pressable
              onPress={() => navigation.navigate("NotificationList")}
              style={({ pressed }) => [styles.heroActionBtn, pressed && { opacity: 0.7 }]}
            >
              <Bell color="#ffffff" size={18} />
              {unreadNotifCount > 0 && (
                <View style={styles.techNotifBadge}>
                  <Text style={styles.techNotifBadgeText}>
                    {unreadNotifCount > 9 ? "9+" : unreadNotifCount}
                  </Text>
                </View>
              )}
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate("AttendanceHistory")}
              style={({ pressed }) => [styles.heroActionBtn, pressed && { opacity: 0.7 }]}
            >
              <History color="#ffffff" size={18} />
            </Pressable>
            <Pressable
              onPress={() => setLogoutModalVisible(true)}
              style={({ pressed }) => [styles.heroActionBtn, pressed && { opacity: 0.7 }]}
            >
              <LogOut color="rgba(255,255,255,0.85)" size={18} />
            </Pressable>
          </View>
        </View>

        {/* Bottom Row: Status pill + Job count */}
        <View style={styles.heroBottomRow}>
          <View
            style={[
              styles.heroStatusPill,
              {
                backgroundColor: attendance?.checkedIn
                  ? "rgba(255,255,255,0.18)"
                  : "rgba(0,0,0,0.18)",
              },
            ]}
          >
            <View
              style={[
                styles.heroStatusDot,
                {
                  backgroundColor: attendance?.shiftCompleted
                    ? "#facc15"
                    : attendance?.checkedIn
                    ? "#4ade80"
                    : "rgba(255,255,255,0.4)",
                },
              ]}
            />
            <Text style={styles.heroStatusText}>
              {attendance?.shiftCompleted
                ? "Shift Completed Today"
                : attendance?.checkedIn
                ? `Active · Since ${attendance.checkInTime}`
                : "Not Checked In"}
            </Text>
          </View>

          <View style={[styles.heroJobBadge, { backgroundColor: "rgba(255,255,255,0.18)" }]}>
            <Text style={styles.heroJobNum}>{assignedCount + inProgressCount + pendingCount}</Text>
            <Text style={styles.heroJobLabel}>Assigned</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isJobsLoading || isRefetching || isRefetchingInvoices || isRefetchingAttendance}
            onRefresh={() => {
              refetch();
              refetchInvoices();
              refetchAttendance();
            }}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Attendance Card */}
        <AppCard style={[styles.attendanceCard, { borderTopWidth: 3, borderTopColor: theme.colors.primary }]}>
          <View style={styles.attendanceHeader}>
            <Clock size={20} color={theme.colors.primary} />
            <Text
              style={[
                styles.attendanceTitle,
                { color: theme.colors.text, fontSize: theme.typography.fontSize.sm, fontWeight: "700" },
              ]}
            >
              ATTENDANCE TRACKING
            </Text>
            {attendance?.shiftCompleted ? (
              <AppBadge label="Shift Completed" variant="success" />
            ) : attendance?.checkedIn ? (
              <AppBadge label="Active Check-in" variant="success" />
            ) : (
              <AppBadge label="Not Checked In" variant="secondary" />
            )}
          </View>

          {attendance?.shiftCompleted ? (
            <View style={styles.attendanceInfo}>
              <View style={styles.metricsContainer}>
                <View style={[styles.metricCard, { backgroundColor: `${theme.colors.success}08` }]}>
                  <LogIn size={16} color={theme.colors.success} />
                  <Text style={styles.metricLabel}>Check In</Text>
                  <Text style={[styles.metricValue, { color: theme.colors.text }]}>{attendance.checkInTime}</Text>
                </View>
                <View style={[styles.metricCard, { backgroundColor: `${theme.colors.danger}08` }]}>
                  <LogOut size={16} color={theme.colors.danger} />
                  <Text style={styles.metricLabel}>Check Out</Text>
                  <Text style={[styles.metricValue, { color: theme.colors.text }]}>{attendance.checkOutTime}</Text>
                </View>
                <View style={[styles.metricCard, { backgroundColor: `${theme.colors.primary}08` }]}>
                  <Timer size={16} color={theme.colors.primary} />
                  <Text style={styles.metricLabel}>Duration</Text>
                  <Text style={[styles.metricValue, { color: theme.colors.text }]}>{attendance.workingHours || "0h 00m"}</Text>
                </View>
              </View>

              <View style={[styles.successBanner, { backgroundColor: `${theme.colors.success}10`, borderColor: `${theme.colors.success}20` }]}>
                <CheckCircle size={18} color={theme.colors.success} />
                <Text style={[styles.successBannerText, { color: theme.colors.success }]}>
                  Shift completed successfully today.
                </Text>
              </View>
            </View>
          ) : attendance?.checkedIn ? (
            <View style={styles.attendanceInfo}>
              <View style={styles.activeSessionContainer}>
                <View style={styles.sessionRow}>
                  <View style={[styles.iconCircle, { backgroundColor: `${theme.colors.success}10` }]}>
                    <LogIn size={16} color={theme.colors.success} />
                  </View>
                  <View style={styles.sessionDetails}>
                    <Text style={styles.sessionLabel}>Checked In At</Text>
                    <Text style={[styles.sessionValue, { color: theme.colors.text }]}>
                      {attendance.checkInTime}
                    </Text>
                  </View>
                </View>

                <View style={styles.sessionRow}>
                  <View style={[styles.iconCircle, { backgroundColor: `${theme.colors.primary}10` }]}>
                    <MapPin size={16} color={theme.colors.primary} />
                  </View>
                  <View style={styles.sessionDetails}>
                    <Text style={styles.sessionLabel}>Physical Location</Text>
                    <Text style={[styles.sessionValue, { color: theme.colors.text }]} numberOfLines={1}>
                      {attendance.checkInLocation || "Location unavailable"}
                    </Text>
                  </View>
                </View>

                <View style={styles.sessionRow}>
                  <View style={[styles.iconCircle, { backgroundColor: `${theme.colors.warning}10` }]}>
                    <Timer size={16} color={theme.colors.warning} />
                  </View>
                  <View style={styles.sessionDetails}>
                    <Text style={styles.sessionLabel}>Working Hours Today</Text>
                    <Text style={[styles.sessionValue, { color: theme.colors.text }]}>
                      {elapsedHours}
                    </Text>
                  </View>
                </View>
              </View>

              <AppButton
                title="Check Out for the Day"
                onPress={handleCheckOutSubmit}
                variant="danger"
                icon={<LogOut size={16} color="#ffffff" />}
                style={{ marginTop: 16 }}
              />
            </View>
          ) : (
            <View style={styles.attendanceInfo}>
              {attendance?.workingHours ? (
                <View style={styles.metricsContainer}>
                  <View style={[styles.metricCard, { backgroundColor: `${theme.colors.primary}08` }]}>
                    <Timer size={16} color={theme.colors.primary} />
                    <Text style={styles.metricLabel}>Prev Hours</Text>
                    <Text style={[styles.metricValue, { color: theme.colors.text }]}>{attendance.workingHours}</Text>
                  </View>
                  <View style={[styles.metricCard, { backgroundColor: `${theme.colors.secondary}08` }]}>
                    <LogOut size={16} color={theme.colors.textMuted} />
                    <Text style={styles.metricLabel}>Prev Ended</Text>
                    <Text style={[styles.metricValue, { color: theme.colors.text }]}>{attendance.checkOutTime}</Text>
                  </View>
                </View>
              ) : (
                <View style={[styles.notCheckedInContainer, { backgroundColor: `${theme.colors.primary}05`, borderColor: `${theme.colors.primary}12` }]}>
                  <Text style={[styles.notCheckedInTitle, { color: theme.colors.text }]}>
                    Ready to start your shift?
                  </Text>
                  <View style={styles.benefitList}>
                    <View style={styles.benefitRow}>
                      <Clock size={16} color={theme.colors.primary} />
                      <Text style={[styles.benefitText, { color: theme.colors.textMuted }]}>
                        Record your daily working hours
                      </Text>
                    </View>
                    <View style={styles.benefitRow}>
                      <CheckCircle size={16} color={theme.colors.primary} />
                      <Text style={[styles.benefitText, { color: theme.colors.textMuted }]}>
                        Access your dispatched tickets
                      </Text>
                    </View>
                  </View>
                </View>
              )}
              <AppButton
                title="Perform Check In"
                onPress={handleCheckInPress}
                variant="primary"
                icon={<LogIn size={16} color="#ffffff" />}
                style={{ marginTop: 8 }}
              />
            </View>
          )}
        </AppCard>

        {/* Job Overview */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16, marginBottom: 8 }}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textMuted, marginTop: 0, marginBottom: 0 }]}>Job Overview</Text>
          <Pressable
            onPress={() => navigation.navigate("TechnicianInvoiceList")}
            style={({ pressed }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                paddingVertical: 4,
                paddingHorizontal: 8,
                borderRadius: 6,
                backgroundColor: `${theme.colors.success}10`,
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Receipt size={16} color={theme.colors.success} />
            <Text style={{ fontSize: 12, fontWeight: "600", color: theme.colors.success }}>Invoices</Text>
          </Pressable>
        </View>
        
        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <Pressable
              onPress={() => navigation.navigate("AssignedJobs", { initialTab: "ASSIGNED" })}
              style={({ pressed }) => [
                styles.statBox,
                {
                  borderLeftColor: theme.colors.primary,
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.borderLight,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <View style={[styles.iconCircle, { backgroundColor: `${theme.colors.primary}10` }]}>
                <FileCheck size={18} color={theme.colors.primary} />
              </View>
              <View style={styles.statInfo}>
                <Text style={[styles.statValue, { color: theme.colors.text }]}>{assignedCount}</Text>
                <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>Assigned</Text>
              </View>
            </Pressable>
            <Pressable
              onPress={() => {
                const inProgressJobs = jobsList.filter(
                  (j) => j.status === "IN_PROGRESS" || j.status === "ACCEPTED" || j.status === "TRAVELLING" || j.status === "REACHED_LOCATION"
                );
                if (inProgressJobs.length === 1) {
                  const activeTicketId = inProgressJobs[0].id || inProgressJobs[0].ticketNo;
                  navigation.navigate("TechnicianJobDetails", { jobId: activeTicketId });
                } else if (inProgressJobs.length > 1) {
                  navigation.navigate("AssignedJobs", { initialTab: "IN_PROGRESS" });
                } else {
                  Alert.alert("Active Jobs", "No active jobs available.");
                }
              }}
              style={({ pressed }) => [
                styles.statBox,
                {
                  borderLeftColor: theme.colors.purple,
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.borderLight,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <View style={[styles.iconCircle, { backgroundColor: `${theme.colors.purple}10` }]}>
                <Timer size={18} color={theme.colors.purple} />
              </View>
              <View style={styles.statInfo}>
                <Text style={[styles.statValue, { color: theme.colors.text }]}>{inProgressCount}</Text>
                <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>Active</Text>
              </View>
            </Pressable>
          </View>
          <View style={styles.statsRow}>
            <Pressable
              onPress={() => navigation.navigate("AssignedJobs", { initialTab: "PENDING" })}
              style={({ pressed }) => [
                styles.statBox,
                {
                  borderLeftColor: theme.colors.amber,
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.borderLight,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <View style={[styles.iconCircle, { backgroundColor: `${theme.colors.amber}10` }]}>
                <AlertTriangle size={18} color={theme.colors.amber} />
              </View>
              <View style={styles.statInfo}>
                <Text style={[styles.statValue, { color: theme.colors.text }]}>{pendingCount}</Text>
                <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>Pending</Text>
              </View>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate("AssignedJobs", { initialTab: "COMPLETED" })}
              style={({ pressed }) => [
                styles.statBox,
                {
                  borderLeftColor: theme.colors.success,
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.borderLight,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <View style={[styles.iconCircle, { backgroundColor: `${theme.colors.success}10` }]}>
                <CheckCircle size={18} color={theme.colors.success} />
              </View>
              <View style={styles.statInfo}>
                <Text style={[styles.statValue, { color: theme.colors.text }]}>{completedCount}</Text>
                <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>Completed</Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* Jobs List */}
        <View style={styles.jobsHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textMuted, marginVertical: 0 }]}>
            Assigned Tickets
          </Text>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <Pressable onPress={() => navigation.navigate("AssignedJobs")}>
              <Text style={{ fontSize: 12, color: theme.colors.primary, fontWeight: "700" }}>View All</Text>
            </Pressable>
          </View>
        </View>

        {isJobsLoading && !isRefetching ? (
          <AppLoader message="Loading assigned jobs..." />
        ) : isError ? (
          <View style={[styles.errorContainer, { borderColor: theme.colors.danger }]}>
            <AlertTriangle size={36} color={theme.colors.danger} />
            <Text style={[styles.errorTitle, { color: theme.colors.text }]}>Failed to load tickets</Text>
            <Text style={[styles.errorSubtitle, { color: theme.colors.textMuted }]}>
              {error?.message || "An unexpected error occurred."}
            </Text>
            <AppButton title="Retry" onPress={() => refetch()} variant="outline" size="sm" style={styles.errorBtn} />
          </View>
        ) : activeTickets.length === 0 ? (
          <EmptyTicketsState onRefresh={refetch} isRefreshing={isRefetching} />
        ) : (
          activeTickets.map((item, index) => (
            <TicketCard
              key={`${item.id || item.ticketNo}-${index}`}
              ticket={item}
              onPress={() => {
                navigation.navigate("TechnicianJobDetails", { jobId: item.id });
              }}
            />
          ))
        )}
      </ScrollView>

      {/* Location Check-In Modal */}
      <Modal visible={locationModalVisible} transparent animationType="slide" onRequestClose={() => setLocationModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setLocationModalVisible(false)}>
          <Pressable
            style={[styles.premiumModalCard, { backgroundColor: theme.colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.premiumIconContainer, { backgroundColor: `${theme.colors.primary}15` }]}>
              <MapPin size={28} color={theme.colors.primary} />
            </View>

            <Text
              style={[
                styles.premiumModalTitle,
                { color: theme.colors.text, fontSize: 18, fontWeight: "700" },
              ]}
            >
              Verify Check-In Location
            </Text>
            <Text style={[styles.premiumModalMessage, { color: theme.colors.textMuted }]}>
              Please enter or confirm your current physical dispatch location:
            </Text>
            <TextInput
              value={locationInput}
              onChangeText={setLocationInput}
              style={[
                styles.premiumLocationInput,
                {
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                  backgroundColor: theme.colors.background,
                },
              ]}
              placeholder="e.g. Noida Sector 62 Office"
              placeholderTextColor={theme.colors.textLight}
            />
            <View style={styles.premiumButtonRow}>
              <AppButton
                title="Cancel"
                variant="ghost"
                onPress={() => setLocationModalVisible(false)}
                style={styles.premiumBtn}
                textStyle={{ color: theme.colors.textMuted }}
              />
              <AppButton
                title="Check In"
                variant="primary"
                onPress={handleCheckInSubmit}
                style={styles.premiumBtn}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <AppConfirmModal
        visible={checkoutModalVisible}
        title="Confirm Check Out"
        message={`Are you sure you want to check out for the day?\n\nWorking hours logged so far: ${getElapsedWorkingHours()}`}
        confirmText="Check Out"
        onConfirm={handleConfirmCheckOut}
        onCancel={() => setCheckoutModalVisible(false)}
        confirmVariant="danger"
      />

      <AppConfirmModal
        visible={logoutModalVisible}
        title="Confirm Log Out"
        message="Are you sure you want to log out of the application?"
        confirmText="Log Out"
        onConfirm={() => {
          setLogoutModalVisible(false);
          logout();
        }}
        onCancel={() => setLogoutModalVisible(false)}
        confirmVariant="danger"
      />

      

      <AppSuccessModal
        visible={successModalVisible}
        title={successTitle}
        message={successMessage}
        onClose={() => setSuccessModalVisible(false)}
        autoCloseDelay={2000}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ─── Hero Section ──────────────────────────────────────────────────────────
  heroSection: {
    paddingHorizontal: 16,
    paddingBottom: 22,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  heroAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  heroInfo: {
    flex: 1,
  },
  heroDashLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  heroName: {
    color: "#ffffff",
    fontSize: 19,
    fontWeight: "800",
    marginTop: 2,
    marginBottom: 1,
  },
  heroMobile: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
  },
  heroActions: {
    flexDirection: "row",
    gap: 8,
  },
  heroActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  techNotifBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  techNotifBadgeText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "700" as const,
    lineHeight: 11,
  },
  heroBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  heroStatusPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 20,
  },
  heroStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  heroStatusText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  heroJobBadge: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    alignItems: "center",
    minWidth: 72,
  },
  heroJobNum: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 24,
  },
  heroJobLabel: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 1,
  },
  // ─────────────────────────────────────────────────────────────────────────

  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  attendanceCard: {
    marginBottom: 16,
    padding: 16,
  },
  attendanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  attendanceTitle: {
    flex: 1,
    letterSpacing: 0.5,
  },
  attendanceInfo: {
    paddingTop: 4,
  },
  attendanceInfoText: {
    fontSize: 14,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 12,
  },
  statsGrid: {
    gap: 12,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    gap: 10,
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 22,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: 1,
  },
  jobsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  jobCard: {
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  jobId: {
    fontSize: 12,
    fontWeight: "700",
  },
  badgeRow: {
    flexDirection: "row",
    gap: 6,
  },
  cardTitle: {
    marginBottom: 8,
  },
  infoLine: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  infoIcon: {
    marginRight: 6,
  },
  infoText: {
    fontSize: 13,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  customerLabel: {
    fontSize: 12,
    flex: 1,
  },
  actionLink: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionLinkText: {
    fontSize: 13,
    fontWeight: "600",
    marginRight: 2,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 24,
  },
  modalCard: {
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    marginBottom: 12,
  },
  locationInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  premiumModalCard: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  premiumIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  premiumModalTitle: {
    textAlign: "center",
    marginBottom: 8,
  },
  premiumModalMessage: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  premiumLocationInput: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 20,
  },
  premiumButtonRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  premiumBtn: {
    flex: 1,
  },
  prevShiftSummary: {
    marginBottom: 8,
  },
  prevShiftTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  prevShiftRow: {
    flexDirection: "row",
    gap: 16,
  },
  prevShiftDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  prevShiftText: {
    fontSize: 13,
  },
  metricsContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.02)",
  },
  metricLabel: {
    fontSize: 10,
    color: "#64748b",
    textTransform: "uppercase",
    fontWeight: "600",
    marginTop: 6,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  successBannerText: {
    fontSize: 13,
    fontWeight: "600",
  },
  activeSessionContainer: {
    gap: 12,
    marginBottom: 8,
  },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  sessionDetails: {
    flex: 1,
  },
  sessionLabel: {
    fontSize: 11,
    color: "#64748b",
    textTransform: "uppercase",
    fontWeight: "600",
  },
  sessionValue: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },
  notCheckedInAlert: {
    marginBottom: 12,
    padding: 4,
  },
  notCheckedInText: {
    fontSize: 13,
    lineHeight: 18,
  },
  notCheckedInContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  notCheckedInTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 12,
  },
  benefitList: {
    gap: 10,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  benefitText: {
    fontSize: 13,
    lineHeight: 18,
  },
  filterContainer: {
    marginBottom: 20,
    marginTop: 10,
  },
  filterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  filterPillScroll: {
    paddingVertical: 4,
    paddingRight: 12,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: "600",
  },
  customFilterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    marginLeft: 8,
  },
  yearSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  yearText: {
    fontSize: 18,
    fontWeight: "700",
  },
  monthsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
    width: "100%",
    marginBottom: 20,
  },
  monthGridItem: {
    width: "30%",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 8,
  },
  monthGridText: {
    fontSize: 14,
    fontWeight: "600",
  },
  errorContainer: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 20,
    backgroundColor: "rgba(239, 68, 68, 0.05)",
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 6,
    textAlign: "center",
  },
  errorSubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
  },
  errorBtn: {
    minWidth: 120,
  },
});
