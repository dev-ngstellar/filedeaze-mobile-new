import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
} from "react-native";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Clock, AlertTriangle, CheckCircle } from "lucide-react-native";

import { useTheme } from "../../theme";
import { TechnicianStackParamList } from "../../types/navigation.types";
import { useJobDetails } from "../../hooks/useJobs";
import { AppHeader } from "../../components/AppHeader";
import { AppCard } from "../../components/AppCard";
import { AppButton } from "../../components/AppButton";
import { AppLoader } from "../../components/AppLoader";

type RouteProps = RouteProp<TechnicianStackParamList, "WorkTimer">;
type NavigationProp = NativeStackNavigationProp<TechnicianStackParamList, "WorkTimer">;

export const WorkTimerScreen = () => {
  const theme = useTheme();
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const { jobId, ticketNo } = route.params;

  const { data: job, isLoading } = useJobDetails(jobId);
  const [liveDuration, setLiveDuration] = useState("00:00:00");

  useEffect(() => {
    if (!job || job.status !== "IN_PROGRESS") {
      setLiveDuration("00:00:00");
      return;
    }

    const inProgressLog = job.statusLogs?.find((log: any) => log.status === "IN_PROGRESS");
    const startTime = inProgressLog ? new Date(inProgressLog.changedAt).getTime() : new Date().getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const diffMs = now - startTime;
      if (diffMs <= 0) {
        setLiveDuration("00:00:00");
        return;
      }
      const totalSecs = Math.floor(diffMs / 1000);
      const secs = totalSecs % 60;
      const totalMins = Math.floor(totalSecs / 60);
      const mins = totalMins % 60;
      const hrs = Math.floor(totalMins / 60);

      const pad = (num: number) => String(num).padStart(2, "0");
      setLiveDuration(`${pad(hrs)}:${pad(mins)}:${pad(secs)}`);
    };

    updateTimer();
    const timerId = setInterval(updateTimer, 1000);
    return () => clearInterval(timerId);
  }, [job]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <AppHeader title="Work Timer" showBack onBackPress={() => navigation.goBack()} />
        <AppLoader message="Loading timer..." />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title="Job Timer"
        subtitle={ticketNo}
        showBack
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Timer Card */}
        <View style={[styles.timerCard, { backgroundColor: `${theme.colors.success}08`, borderColor: theme.colors.success }]}>
          <Clock size={32} color={theme.colors.success} />
          <Text style={[styles.timerLabel, { color: theme.colors.textMuted }]}>
            WORK DURATION IN PROGRESS
          </Text>
          <Text style={[styles.timerValue, { color: theme.colors.success }]}>
            {liveDuration}
          </Text>
        </View>

        {/* Job info card */}
        <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>Job Details</Text>
        <AppCard style={styles.card}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: theme.colors.text, marginBottom: 4 }}>
            {job?.service || "Service Type"}
          </Text>
          <Text style={{ fontSize: 13, color: theme.colors.textMuted, marginBottom: 8 }}>
            Customer: {job?.customerName}
          </Text>
          <Text style={{ fontSize: 13, color: theme.colors.textMuted }}>
            Address: {job?.address}
          </Text>
        </AppCard>

        {/* Action button row */}
        <View style={styles.actions}>
          <AppButton
            title="Complete"
            onPress={() => navigation.navigate("TechnicianJobDetails", { jobId, openCompleteJob: true })}
            variant="success"
            size="lg"
            icon={<CheckCircle size={20} color="#ffffff" />}
          />
          <AppButton
            title="Pending"
            onPress={() => navigation.navigate("TechnicianJobDetails", { jobId, openMarkPending: true })}
            variant="warning"
            size="lg"
            icon={<AlertTriangle size={20} color="#ffffff" />}
          />
          <AppButton
            title="Return to Job Details"
            onPress={() => navigation.goBack()}
            variant="outline"
            size="lg"
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  timerCard: {
    paddingVertical: 36,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    marginBottom: 24,
    gap: 8,
  },
  timerLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
  timerValue: {
    fontSize: 54,
    fontWeight: "800",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    letterSpacing: 2,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  card: { padding: 16, marginBottom: 24 },
  actions: { gap: 12 },
});
