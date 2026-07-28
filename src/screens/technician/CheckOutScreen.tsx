import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Clock, LogOut, CheckCircle2 } from "lucide-react-native";

import { useTheme } from "../../theme";
import { TechnicianStackParamList } from "../../types/navigation.types";
import { useCheckOut, useAttendanceStatus } from "../../hooks/useJobs";
import { getFreshLocationForAttendance } from "../../utils/location";
import { AppHeader } from "../../components/AppHeader";
import { AppCard } from "../../components/AppCard";
import { AppButton } from "../../components/AppButton";
import { AppLoader } from "../../components/AppLoader";
import { AppAlertModal } from "../../components/AppAlertModal";

type NavigationProp = NativeStackNavigationProp<TechnicianStackParamList, "CheckOut">;

export const CheckOutScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  
  const { data: attendance, isLoading } = useAttendanceStatus();
  const checkOutMutation = useCheckOut();

  const [workingHoursStr, setWorkingHoursStr] = useState("0h 00m 00s");

  // Styled alert popup states
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<"success" | "error" | "warning">("warning");
  const [onAlertClose, setOnAlertClose] = useState<(() => void) | null>(null);

  const showAlert = (title: string, message: string, type: "success" | "error" | "warning" = "warning", onClosePress?: () => void) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setOnAlertClose(() => onClosePress || null);
    setAlertVisible(true);
  };

  useEffect(() => {
    if (!attendance?.rawCheckInTime) return;

    const checkInDate = new Date(attendance.rawCheckInTime);
    const updateTimer = () => {
      const now = new Date();
      const diffMs = now.getTime() - checkInDate.getTime();
      if (diffMs <= 0) {
        setWorkingHoursStr("0h 00m 00s");
        return;
      }
      const totalSecs = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSecs / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      const secs = totalSecs % 60;
      setWorkingHoursStr(`${hours}h ${String(mins).padStart(2, "0")}m ${String(secs).padStart(2, "0")}s`);
    };

    updateTimer();
    const intervalId = setInterval(updateTimer, 1000);
    return () => clearInterval(intervalId);
  }, [attendance?.rawCheckInTime]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCheckOut = async () => {
    if (isSubmitting || checkOutMutation.isPending) return;
    setIsSubmitting(true);
    try {
      const coords = await getFreshLocationForAttendance();
      const res: any = await checkOutMutation.mutateAsync({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
      let finalWorkingHours = "N/A";
      const attendanceData = res?.data;
      if (attendanceData?.checkInTime && attendanceData?.checkOutTime) {
        const diffMs = new Date(attendanceData.checkOutTime).getTime() - new Date(attendanceData.checkInTime).getTime();
        const totalMins = Math.floor(diffMs / 60000);
        const h = Math.floor(totalMins / 60);
        const m = totalMins % 60;
        finalWorkingHours = `${h}h ${String(m).padStart(2, "0")}m`;
      } else {
        finalWorkingHours = workingHoursStr;
      }

      showAlert(
        "Shift Ended",
        `Successfully checked out.\nWorking hours today: ${finalWorkingHours}`,
        "success",
        () => navigation.navigate("TechnicianHome")
      );
    } catch (err: any) {
      showAlert("Error", err.message || "Failed to check out.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <AppHeader title="Perform Check Out" showBack onBackPress={() => navigation.goBack()} />
        <AppLoader message="Loading shift details..." />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Perform Check Out" showBack onBackPress={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.centerCol}>
          <View style={[styles.iconCircle, { backgroundColor: `${theme.colors.danger}12` }]}>
            <LogOut size={48} color={theme.colors.danger} />
          </View>
          <Text style={[styles.title, { color: theme.colors.text }]}>End Your Shift</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
            Are you ready to sign out for the day? Make sure all jobs are closed or updated.
          </Text>
        </View>

        <AppCard style={styles.card}>
          <View style={styles.infoRow}>
            <Clock size={20} color={theme.colors.primary} />
            <View>
              <Text style={{ fontSize: 12, color: theme.colors.textMuted, fontWeight: "600" }}>
                SHIFT START TIME
              </Text>
              <Text style={{ fontSize: 16, color: theme.colors.text, fontWeight: "700", marginTop: 2 }}>
                {attendance?.checkInTime || "N/A"}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: "#f1f5f9" }]} />

          <View style={styles.infoRow}>
            <Clock size={20} color={theme.colors.success} />
            <View>
              <Text style={{ fontSize: 12, color: theme.colors.textMuted, fontWeight: "600" }}>
                TOTAL TIME SPENT WORKING
              </Text>
              <Text style={{ fontSize: 24, color: theme.colors.success, fontWeight: "800", marginTop: 4 }}>
                {workingHoursStr}
              </Text>
            </View>
          </View>
        </AppCard>

        <View style={styles.actions}>
          <AppButton
            title="Perform Check Out"
            onPress={handleCheckOut}
            loading={checkOutMutation.isPending}
            variant="danger"
            size="lg"
            icon={<LogOut size={20} color="#ffffff" />}
          />
          <AppButton
            title="Cancel"
            onPress={() => navigation.goBack()}
            variant="outline"
            size="lg"
          />
        </View>
      </ScrollView>

      {/* Custom Alert/Warning Modal */}
      <AppAlertModal
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
        onClose={() => {
          setAlertVisible(false);
          if (onAlertClose) onAlertClose();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  centerCol: { alignItems: "center", marginBottom: 24, marginTop: 12 },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: "800", marginBottom: 8 },
  subtitle: { fontSize: 13, textAlign: "center", lineHeight: 20, paddingHorizontal: 16 },
  card: { padding: 18, marginBottom: 24, gap: 16 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  divider: { height: 1, marginVertical: 8 },
  actions: { gap: 12 },
});
