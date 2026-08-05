import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Animated,
  ActivityIndicator,
  Linking,  
  Alert,
} from "react-native";
import { useNavigation, useRoute, RouteProp, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Ticket,
  UserCheck,
  ThumbsUp,
  Car,
  MapPin,
  Wrench,
  Clock,
  CheckCircle2,
  XCircle,
  Phone,
  Calendar,
  Briefcase,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Compass,
  LucideIcon,
  User,
  Receipt,
} from "lucide-react-native";

import { useTheme } from "../../theme";
import { useTechnicianJobs, useTechnicianInvoices } from "../../hooks/useJobs";
import { TechnicianStackParamList } from "../../types/navigation.types";
import { AppHeader } from "../../components/AppHeader";
import { TicketStatus } from "../../services/job.service";
import { StatusBadge } from "../../components/StatusBadge";
import { AppConfirmModal } from "../../components/AppConfirmModal";
import { AMCBadge } from "../../components/amc/AMCBadge";

type NavigationProp = NativeStackNavigationProp<TechnicianStackParamList, "AssignedJobs">;
type RouteProps = RouteProp<TechnicianStackParamList, "AssignedJobs">;

type TabFilter = "ALL" | "ASSIGNED" | "ACCEPTED" | "IN_PROGRESS" | "PENDING" | "COMPLETED";

const TAB_FILTERS: { label: string; value: TabFilter }[] = [
  { label: "ALL", value: "ALL" },
  { label: "ASSIGNED", value: "ASSIGNED" },
  { label: "ACCEPTED", value: "ACCEPTED" },
  { label: "IN PROGRESS", value: "IN_PROGRESS" },
  { label: "PENDING", value: "PENDING" },
  { label: "COMPLETED", value: "COMPLETED" },
];

const ACTION_LABEL: Partial<Record<TicketStatus, string>> = {
  ASSIGNED: "View Details",
  ACCEPTED: "Start Travelling",
  TRAVELLING: "Mark Reached",
  REACHED: "Start Job",
  IN_PROGRESS: "Complete / Pending",
  PENDING: "Resume Job",
  INVOICE_GENERATED: "View Invoice Details",
  CLOSED: "View Invoice Details",
} as any;

const getTodayStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const AssignedJobsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();

  const [activeTab, setActiveTab] = useState<TabFilter>(route.params?.initialTab || "ALL");

  useEffect(() => {
    if (route.params?.initialTab) {
      setActiveTab(route.params.initialTab);
    }
  }, [route.params?.initialTab]);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [lockModalVisible, setLockModalVisible] = useState(false);
  const [lockModalMessage, setLockModalMessage] = useState("");
  const tabListRef = useRef<FlatList>(null);

  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [calendarVisible, setCalendarVisible] = useState(false);

  const getSelectedDateText = () => {
    if (!selectedDate) return "Filter by Date";
    const parts = selectedDate.split("-");
    const y = parts[0];
    const mIdx = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return `${MONTHS[mIdx].slice(0, 3)} ${d}, ${y}`;
  };

  const MONTHS = useMemo(() => [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ], []);

  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth, 0).getDate();
  }, [currentMonth, currentYear]);

  const firstDayIndex = useMemo(() => {
    return new Date(currentYear, currentMonth - 1, 1).getDay();
  }, [currentMonth, currentYear]);

  const calendarCells = useMemo(() => {
    const cells = [];
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ day: null, key: `empty-${i}` });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      cells.push({ day, dateStr, key: dateStr });
    }
    return cells;
  }, [currentMonth, currentYear, daysInMonth, firstDayIndex]);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Sync activeTab whenever the screen focuses (comes into view)
  useFocusEffect(
    React.useCallback(() => {
      if (route.params?.initialTab) {
        setActiveTab(route.params.initialTab);
        setSelectedDate(null);
      }
    }, [route.params?.initialTab])
  );

  useEffect(() => {
    if (activeTab === "COMPLETED") {
      setSelectedDate(null);
    }
  }, [activeTab]);

  // Auto-scroll FlatList to activeTab so it's centered in view
  useEffect(() => {
    const index = TAB_FILTERS.findIndex((t) => t.value === activeTab);
    if (index !== -1 && tabListRef.current) {
      setTimeout(() => {
        try {
          tabListRef.current?.scrollToIndex({
            index,
            animated: true,
            viewPosition: 0.5,
          });
        } catch (e) {
          // Prevent crash if layout is not fully measured yet
        }
      }, 100);
    }
  }, [activeTab]);

  const { data: jobs = [], isLoading, refetch, isRefetching } = useTechnicianJobs();
  const { data: invoices = [], isLoading: isInvoicesLoading, refetch: refetchInvoices, isRefetching: isRefetchingInvoices } = useTechnicianInvoices();

  const handlePhoneCall = (num: string) => {
    Linking.openURL(`tel:${num}`);
  };

  const getLeftBorderColor = (status: TicketStatus) => {
    switch (status as any) {
      case "ASSIGNED":
      case "NEW":
      case "ACCEPTED":
        return theme.colors.primary;
      case "TRAVELLING":
      case "REACHED":
        return "#E67E22";
      case "IN_PROGRESS":
      case "INVOICE_GENERATED":
        return "#27AE60";
      case "PENDING":
      case "RESCHEDULED":
        return "#F39C12";
      case "COMPLETED":
      case "CLOSED":
        return theme.colors.textMuted || "#94a3b8";
      default:
        return theme.colors.borderLight;
    }
  };

  const invoiceTickets = useMemo(() => {
    const list = Array.isArray(invoices) ? invoices : [];
    return list.map((inv: any) => ({
      id: inv.ticketId,
      ticketNo: inv.ticket?.ticketNumber || inv.invoiceNumber,
      service: `Invoice: #${inv.invoiceNumber}`,
      status: "CLOSED" as TicketStatus,
      customerName: inv.ticket?.customer?.name || "Client",
      customerMobile: "",
      description: `Payment Mode: ${inv.payment?.method || "N/A"}\nTotal Collected: ₹${inv.total}`,
      scheduledDate: inv.generatedAt 
        ? new Date(inv.generatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })
        : "—",
      scheduledTime: inv.generatedAt
        ? new Date(inv.generatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" })
        : "",
      address: inv.ticket?.serviceAddress || inv.ticket?.customer?.address || "",
      paymentCollection: Number(inv.total),
      paymentMethod: inv.payment?.method,
      scheduledDateRaw: inv.generatedAt ? inv.generatedAt.substring(0, 10) : "",
      closedAt: inv.generatedAt ? String(inv.generatedAt) : undefined,
      // billingType is set to WARRANTY exactly when the ticket was AMC-covered at billing time
      // (see computeBillingBreakdown on the backend) — the only AMC signal invoices retain.
      isAmcCovered: inv.billingType === "WARRANTY",
    }));
  }, [invoices]);

  // Status checks for filtering
  const filteredJobs = useMemo(() => {
    if (activeTab === "COMPLETED") {
      return invoiceTickets;
    }
    const list = Array.isArray(jobs) ? jobs : [];
    let tabFiltered = list;
    switch (activeTab) {
      case "ASSIGNED":
        tabFiltered = list.filter((j) => j.status === "ASSIGNED" || j.status === "NEW_TICKET");
        break;
      case "ACCEPTED":
        tabFiltered = list.filter((j) => j.status === "ACCEPTED");
        break;
      case "IN_PROGRESS":
        tabFiltered = list.filter((j) => j.status === "IN_PROGRESS" || j.status === "TRAVELLING" || j.status === "REACHED_LOCATION");
        break;
      case "PENDING":
        tabFiltered = list.filter((j) => j.status === "PENDING" || j.status === "RESCHEDULED");
        break;
      case "ALL":
        tabFiltered = [...list, ...invoiceTickets];
        break;
      default:
        tabFiltered = list;
    }

    if (selectedDate) {
      return tabFiltered.filter((j) => {
        if (j.scheduledDateRaw === selectedDate) return true;
        if (j.closedAt && j.closedAt.substring(0, 10) === selectedDate) return true;
        if (j.invoiceGeneratedAt && j.invoiceGeneratedAt.substring(0, 10) === selectedDate) return true;
        return false;
      });
    }
    return tabFiltered;
  }, [jobs, activeTab, selectedDate, invoiceTickets]);

  const renderJobCard = ({ item }: { item: any }) => {
    let isLocked = false;
    let lockMessage = "";
    
    const assignmentDateStr = item.assignedAt || item.createdAt;
    if (assignmentDateStr && (item.status === "ASSIGNED" || item.status === "PENDING" || item.status === "NEW")) {
      const assignedTime = new Date(assignmentDateStr).getTime();
      const currentTime = Date.now();
      const hoursDifference = (currentTime - assignedTime) / (1000 * 60 * 60);
      if (hoursDifference > 48) {
        isLocked = true;
        lockMessage = "The acceptance period for this ticket has expired. Please contact your manager for reassignment.";
      }
    }

    const statusColor = getLeftBorderColor(item.status);
    const action = isLocked ? `Locked (Time Expired)` : ACTION_LABEL[item.status as TicketStatus];
    const formattedDate = item.scheduledDate;

    const handlePress = () => {
      if (isLocked) {
        setLockModalMessage(lockMessage);
        setLockModalVisible(true);
        return;
      }
      navigation.navigate("TechnicianJobDetails", { jobId: item.id });
    };

    return (
      <View
        style={[
          styles.cardContainer,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.borderLight,
            opacity: isLocked ? 0.6 : 1,
          },
        ]}
      >
        {/* Left colored border strip */}
        <View style={[styles.statusIndicatorStrip, { backgroundColor: statusColor }]} />

        <View style={styles.cardMain}>
          {/* Header Row */}
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.ticketNoText, { color: theme.colors.textMuted }]}>
              {item.ticketNo}
            </Text>
          </View>

          {/* Service Name */}
          <View style={[styles.serviceRow, { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}>
            <Text style={[styles.serviceTitle, { color: theme.colors.text, flex: 1, marginRight: 8 }]} numberOfLines={1}>
              {item.service}
            </Text>
            <StatusBadge status={item.status} paymentCollection={item.paymentCollection} />
          </View>

          {item.isAmcCovered ? (
            <View style={{ marginTop: 6, marginBottom: 2 }}>
              <AMCBadge label="AMC JOB" active />
            </View>
          ) : null}

          {/* Category */}
          {item.category && (
            <View style={styles.metaRow}>
              <Briefcase size={12} color={theme.colors.textLight} />
              <Text style={[styles.metaText, { color: theme.colors.textMuted }]}>
                {item.category}
              </Text>
            </View>
          )}

          {/* Description */}
          {item.description ? (
            <Text style={[styles.descText, { color: theme.colors.textMuted }]} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}

          <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

          {/* Customer & Call Row */}
          <View style={styles.customerRow}>
            <View style={styles.customerInfo}>
              <View style={[styles.avatarCircle, { backgroundColor: `${theme.colors.primary}08` }]}>
                <User size={14} color={theme.colors.primary} />
              </View>
              <View style={styles.customerDetails}>
                <Text style={[styles.customerName, { color: theme.colors.text }]} numberOfLines={1}>
                  {item.customerName}
                </Text>
                {item.customerMobile ? (
                  <Text style={[styles.customerPhone, { color: theme.colors.textMuted }]}>
                    {item.customerMobile}
                  </Text>
                ) : null}
              </View>
            </View>

            {item.customerMobile ? (
              <Pressable
                onPress={() => handlePhoneCall(item.customerMobile)}
                style={({ pressed }) => [
                  styles.phoneBtn,
                  {
                    backgroundColor: `${theme.colors.success}15`,
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
              >
                <Phone size={14} color={theme.colors.success} />
              </Pressable>
            ) : null}
          </View>

          {/* Date & Time */}
          <View style={styles.metaRow}>
            <Calendar size={13} color={theme.colors.textLight} style={{ marginRight: 6 }} />
            <Text style={[styles.metaText, { color: theme.colors.text }]}>
              {formattedDate} {item.scheduledTime ? `· ${item.scheduledTime}` : ""}
            </Text>
          </View>

          {/* Address */}
          <View style={[styles.metaRow, { alignItems: "flex-start" }]}>
            <MapPin size={13} color={theme.colors.textLight} style={{ marginRight: 6, marginTop: 2 }} />
            <Text style={[styles.metaText, { color: theme.colors.textMuted, flex: 1 }]} numberOfLines={2}>
              {item.address}
            </Text>
          </View>

          {/* Footer Action Button */}
          {action ? (
            <>
              <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />
              <Pressable
                onPress={handlePress}
                style={({ pressed }) => [
                  styles.actionBtnRow,
                  pressed && { opacity: 0.7 }
                ]}
              >
                <Text style={[styles.actionLabelText, { color: theme.colors.primary }]}>
                  {action}
                </Text>
                <ChevronRight size={14} color={theme.colors.primary} />
              </Pressable>
            </>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title="Assigned Jobs"
        subtitle="Your dispatched service tickets"
        showBack
        onBackPress={() => navigation.goBack()}
      />

      {/* Calendar Toggle Bar */}
      <Pressable
        onPress={() => setCalendarVisible(!calendarVisible)}
        style={({ pressed }: { pressed: boolean }) => [
          styles.toggleBar,
          { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.borderLight },
          pressed && { opacity: 0.8 }
        ]}
      >
        <View style={styles.toggleBarLeft}>
          <Calendar size={18} color={theme.colors.primary} />
          <Text style={[styles.toggleBarText, { color: theme.colors.text }]}>
            {getSelectedDateText()}
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {selectedDate && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                setSelectedDate(null);
              }}
              style={({ pressed }: { pressed: boolean }) => [
                styles.todayBtn,
                { backgroundColor: `${theme.colors.primary}12`, opacity: pressed ? 0.7 : 1 }
              ]}
            >
              <Text style={[styles.todayBtnText, { color: theme.colors.primary }]}>Show All</Text>
            </Pressable>
          )}
          <ChevronDown
            size={18}
            color={theme.colors.textMuted}
            style={{ transform: [{ rotate: calendarVisible ? "180deg" : "0deg" }] }}
          />
        </View>
      </Pressable>

      {/* Calendar Component */}
      {calendarVisible && (
        <View style={[styles.calendarContainer, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.borderLight }]}>
          <View style={styles.calendarHeader}>
            <Pressable onPress={handlePrevMonth} style={styles.navBtn}>
              <ChevronLeft size={20} color={theme.colors.text} />
            </Pressable>
            <Text style={[styles.calendarTitle, { color: theme.colors.text }]}>
              {MONTHS[currentMonth - 1]} {currentYear}
            </Text>
            <Pressable onPress={handleNextMonth} style={styles.navBtn}>
              <ChevronRight size={20} color={theme.colors.text} />
            </Pressable>
          </View>

          <View style={styles.weekDaysRow}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <Text key={day} style={[styles.weekDayText, { color: theme.colors.textMuted }]}>
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {calendarCells.map((cell) => {
              if (!cell.day) {
                return <View key={cell.key} style={styles.dayCell} />;
              }

              const { day, dateStr } = cell;
              const isSelected = selectedDate === dateStr;
              const isToday = dateStr === getTodayStr();
              const isFuture = dateStr ? dateStr > getTodayStr() : false;

              return (
                <Pressable
                  key={cell.key}
                  disabled={isFuture}
                  onPress={() => {
                    setSelectedDate(isSelected ? null : dateStr!);
                    setCalendarVisible(false);
                  }}
                  style={({ pressed }: { pressed: boolean }) => [
                    styles.dayCell,
                    isSelected && { backgroundColor: theme.colors.primary, borderRadius: 20 },
                    isToday && !isSelected && { borderWidth: 1.5, borderColor: theme.colors.primary, borderRadius: 20 },
                    isFuture && { opacity: 0.3 },
                    pressed && !isFuture && { opacity: 0.7 },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      {
                        color: isSelected
                          ? "#ffffff"
                          : isFuture
                          ? theme.colors.textLight
                          : theme.colors.text,
                        fontWeight: (isSelected || isToday) && !isFuture ? "700" : "400",
                      },
                    ]}
                  >
                    {day}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Pill Filter Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: theme.colors.borderLight }]}>
        <FlatList
          ref={tabListRef}
          data={TAB_FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.value}
          contentContainerStyle={styles.tabContentContainer}
          renderItem={({ item }) => {
            const isSel = item.value === activeTab;
            return (
              <Pressable
                onPress={() => setActiveTab(item.value)}
                style={[
                  styles.tabPill,
                  isSel
                    ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                    : { backgroundColor: "transparent", borderColor: theme.colors.border },
                ]}
              >
                <Text
                  style={[
                    styles.tabPillText,
                    { color: isSel ? "#ffffff" : theme.colors.textMuted },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {/* Job Count Indicator */}
      <View style={styles.countContainer}>
        <Text style={[styles.countText, { color: theme.colors.textMuted }]}>
          {filteredJobs.length} Job{filteredJobs.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {/* Main List */}
      {(isLoading || (activeTab === "COMPLETED" && isInvoicesLoading)) && !(isRefetching || isRefetchingInvoices) ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredJobs}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={renderJobCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={isRefetching || isRefetchingInvoices}
          onRefresh={() => {
            refetch();
            refetchInvoices();
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Wrench size={40} color={theme.colors.textLight} style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                No jobs found
              </Text>
            </View>
          }
        />
      )}
      <AppConfirmModal
        visible={lockModalVisible}
        title="Ticket Locked"
        message={lockModalMessage}
        confirmText="Close"
        confirmVariant="warning" 
        showCancel={false}
        onConfirm={() =>   setLockModalVisible(false)}
        onCancel={() => setLockModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  calendarContainer: {
    padding: 16,
    borderBottomWidth: 1,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  navBtn: {
    padding: 8,
  },
  todayBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  todayBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  weekDaysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  weekDayText: {
    width: "14%",
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.28%",
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  dayText: {
    fontSize: 14,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    position: "absolute",
    bottom: 4,
  },
  toggleBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  toggleBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  toggleBarText: {
    fontSize: 14,
    fontWeight: "600",
  },
  tabBar: {
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  tabContentContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tabPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  tabPillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  countContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  countText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  cardContainer: {
    borderRadius: 12,
    flexDirection: "row",
    overflow: "hidden",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  statusIndicatorStrip: {
    width: 6,
  },
  cardMain: {
    flex: 1,
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  ticketNoText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  metaText: {
    fontSize: 12.5,
    marginLeft: 6,
    fontWeight: "500",
  },
  descText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 6,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  customerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  customerDetails: {
    flex: 1,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  customerName: {
    fontSize: 14,
    fontWeight: "600",
  },
  customerPhone: {
    fontSize: 12.5,
  },
  phoneBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  actionBtnRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 4,
  },
  actionLabelText: {
    fontSize: 13,
    fontWeight: "700",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "600",
  },
});

export default AssignedJobsScreen;
