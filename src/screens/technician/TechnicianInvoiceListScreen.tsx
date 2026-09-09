import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar,
  Receipt,
  User,
  Clock,
  Wrench,
} from "lucide-react-native";

import { useTheme } from "../../theme";
import { useTechnicianInvoices } from "../../hooks/useJobs";
import { TechnicianInvoice } from "../../services/job.service";
import { TechnicianStackParamList } from "../../types/navigation.types";
import { AppHeader } from "../../components/AppHeader";
import { AppLoader } from "../../components/AppLoader";
import { AppEmptyState } from "../../components/AppEmptyState";
import { AppCard } from "../../components/AppCard";
import { AppBadge } from "../../components/AppBadge";

type NavigationProp = NativeStackNavigationProp<TechnicianStackParamList, "TechnicianInvoiceList">;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const getTodayStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const TechnicianInvoiceListScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [calendarVisible, setCalendarVisible] = useState(false);

  const { data: invoices = [], isLoading, refetch, isRefetching } = useTechnicianInvoices(currentMonth, currentYear);

  const handlePrevYear = () => {
    setCurrentYear((y) => y - 1);
  };

  const handleNextYear = () => {
    setCurrentYear((y) => y + 1);
  };

  const getSelectedDateText = () => {
    return `${MONTHS[currentMonth - 1]} ${currentYear}`;
  };

  // Filter invoices by current month and year
  const filteredInvoices = useMemo(() => {
    return Array.isArray(invoices) ? invoices : [];
  }, [invoices]);

  const renderInvoiceCard = ({ item }: { item: TechnicianInvoice }) => {
    const formattedDate = item.generatedAt
      ? new Date(item.generatedAt).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          timeZone: "Asia/Kolkata",
        })
      : "—";

    return (
      <AppCard style={styles.invoiceCard} elevation={false} border>
        <Pressable
          onPress={() =>
            navigation.navigate("InvoiceGenerate", {
              invoice: item,
              jobId: item.ticketId,
              ticketNo: item.ticket?.ticketNumber || item.invoiceNumber,
              amount: Number(item.total),
              paymentMethod: item.payment?.method || "CASH",
              invoiceNo: item.invoiceNumber,
              invoiceSubtotal: Number(item.subtotal),
              invoiceGstAmount: Number(item.gstAmount),
              invoiceGstPercent: Number(item.gstPercent),
              invoiceTotal: Number(item.total),
              invoiceGeneratedAt: item.generatedAt,
            })
          }
        >
          <View style={styles.invoiceHeader}>
            <View style={styles.invoiceNoRow}>
              <Receipt size={16} color={theme.colors.primary} />
              <Text style={[styles.invoiceNumberText, { color: theme.colors.text }]}>
                #{item.invoiceNumber}
              </Text>
            </View>
            {item.billingType ? (
              <AppBadge label={item.billingType.replace("_", " ")} variant="primary" />
            ) : null}
          </View>

          <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

          <View style={styles.infoRow}>
            <User size={14} color={theme.colors.textMuted} />
            <Text style={[styles.infoText, { color: theme.colors.text }]}>
              {item.ticket?.customer?.name || "Client"}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Clock size={14} color={theme.colors.textMuted} />
            <Text style={[styles.infoText, { color: theme.colors.textMuted }]}>
              Generated: {formattedDate}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

          <View style={styles.amountRow}>
            <View>
              <Text style={{ fontSize: 10, color: theme.colors.textMuted, textTransform: "uppercase" }}>
                Payment Method: {item.payment?.method || "CASH"}
              </Text>
            </View>
            <View style={styles.totalBlock}>
              <Text style={{ fontSize: 11, color: theme.colors.textMuted, textAlign: "right" }}>Total</Text>
              <Text style={[styles.totalAmount, { color: theme.colors.text }]}>
                ₹{Number(item.total).toLocaleString("en-IN")}
              </Text>
            </View>
          </View>
        </Pressable>
      </AppCard>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title="My Invoices"
        subtitle="Invoices generated by you"
        showBack
        onBackPress={() => navigation.goBack()}
      />

      {/* Date/Calendar Toggle Bar */}
      <Pressable
        onPress={() => setCalendarVisible(!calendarVisible)}
        style={({ pressed }) => [
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
          <ChevronDown
            size={18}
            color={theme.colors.textMuted}
            style={{ transform: [{ rotate: calendarVisible ? "180deg" : "0deg" }] }}
          />
        </View>
      </Pressable>

      {/* Month & Year Picker Component */}
      {calendarVisible && (
        <View style={[styles.calendarContainer, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.borderLight }]}>
          <View style={styles.calendarHeader}>
            <Pressable onPress={handlePrevYear} style={styles.navBtn}>
              <ChevronLeft size={20} color={theme.colors.text} />
            </Pressable>
            <Text style={[styles.calendarTitle, { color: theme.colors.text }]}>
              {currentYear}
            </Text>
            <Pressable onPress={handleNextYear} style={styles.navBtn}>
              <ChevronRight size={20} color={theme.colors.text} />
            </Pressable>
          </View>

          <View style={styles.monthsGrid}>
            {MONTHS.map((monthName, idx) => {
              const monthNum = idx + 1;
              const isSelected = currentMonth === monthNum;
              return (
                <Pressable
                  key={monthName}
                  onPress={() => {
                    setCurrentMonth(monthNum);
                    setCalendarVisible(false);
                  }}
                  style={({ pressed }) => [
                    styles.monthCell,
                    isSelected && { backgroundColor: theme.colors.primary, borderRadius: 20 },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text
                    style={[
                      styles.monthText,
                      {
                        color: isSelected ? "#ffffff" : theme.colors.text,
                        fontWeight: isSelected ? "700" : "400",
                      },
                    ]}
                  >
                    {monthName.substring(0, 3)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Main List */}
      {isLoading && !isRefetching ? (
        <AppLoader message="Loading invoices..." />
      ) : (
        <FlatList
          data={filteredInvoices}
          keyExtractor={(item) => item.id}
          renderItem={renderInvoiceCard}
          refreshing={isRefetching}
          onRefresh={refetch}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <AppEmptyState
              title="No Invoices Found"
              description={`No invoices found for ${MONTHS[currentMonth - 1]} ${currentYear}.`}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  todayBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  todayBtnText: {
    fontSize: 11,
    fontWeight: "700",
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
    fontSize: 15,
    fontWeight: "700",
  },
  navBtn: {
    padding: 8,
  },
  monthsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  monthCell: {
    width: "30%",
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 6,
  },
  monthText: {
    fontSize: 14,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  invoiceCard: {
    marginBottom: 12,
    padding: 16,
  },
  invoiceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  invoiceNoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  invoiceNumberText: {
    fontSize: 15,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalBlock: {
    alignItems: "flex-end",
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 2,
  },
});
