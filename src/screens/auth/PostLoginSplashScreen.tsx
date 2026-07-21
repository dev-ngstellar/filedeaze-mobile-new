import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { Shield, CheckCircle } from "lucide-react-native";
import { useAuthStore } from "../../store/auth.store";
import { APP_CONFIG } from "../../config/app.config";

const { width } = Dimensions.get("window");

export const PostLoginSplashScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  const isTechnician = user?.role === "TECHNICIAN";

  const primaryColor = isTechnician ? "#1883a3" : "#4F6FE8";
  const gradientColors: [string, string, string] = isTechnician
    ? ["#0d6b85", "#1883a3", "#22a8cc"]
    : ["#3555c8", "#4F6FE8", "#6B8FF5"];

  useEffect(() => {
    // Entry animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Dot pulse animation
    const pulseDot = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 350, useNativeDriver: true }),
        ])
      );

    pulseDot(dot1, 0).start();
    pulseDot(dot2, 200).start();
    pulseDot(dot3, 400).start();

    // Navigate after 2.8 seconds
    const timer = setTimeout(() => {
      const target = isTechnician ? "TechnicianHome" : "CustomerDashboard";
      navigation.replace(target);
    }, 2800);

    return () => clearTimeout(timer);
  }, []);

  const roleName = isTechnician ? "Field Technician" : "Customer";
  const roleColor = isTechnician ? "#22a8cc" : "#6B8FF5";

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      {/* Background decorative circles */}
      <View style={[styles.bgCircle, styles.bgCircleLarge, { borderColor: "rgba(255,255,255,0.08)" }]} />
      <View style={[styles.bgCircle, styles.bgCircleSmall, { borderColor: "rgba(255,255,255,0.06)" }]} />

      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        {/* Logo section */}
        <View style={styles.logoWrapper}>
          <View style={styles.logoRingOuter}>
            <View style={styles.logoRingInner}>
              {(APP_CONFIG as any).logo ? (
                <Image
                  source={{ uri: (APP_CONFIG as any).logo }}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={[styles.logoFallback, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                  <Shield color="#ffffff" size={44} strokeWidth={1.8} />
                </View>
              )}
            </View>
          </View>
        </View>

        {/* App name */}
        <Text style={styles.appName}>{APP_CONFIG.appName}</Text>

        {/* Divider line */}
        <View style={styles.divider} />

        {/* Welcome message */}
        <Animated.View style={{ transform: [{ translateY: slideAnim }], opacity: fadeAnim }}>
          <Text style={styles.welcomeLabel}>Welcome back</Text>
          <Text style={styles.userName}>{user?.name ?? "User"}</Text>

          {/* Role badge */}
          <View style={styles.roleBadgeRow}>
            <View style={styles.roleBadge}>
              <CheckCircle size={13} color="#ffffff" strokeWidth={2.5} />
              <Text style={styles.roleBadgeText}>{roleName}</Text>
            </View>
          </View>

          <Text style={styles.subText}>Setting up your workspace…</Text>
        </Animated.View>
      </Animated.View>

      {/* Animated dots at bottom */}
      <View style={styles.dotsContainer}>
        {[dot1, dot2, dot3].map((dot, i) => (
          <Animated.View
            key={i}
            style={[styles.dot, { opacity: dot }]}
          />
        ))}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  bgCircle: {
    position: "absolute",
    borderWidth: 1,
    borderRadius: 9999,
  },
  bgCircleLarge: {
    width: width * 1.4,
    height: width * 1.4,
    top: -width * 0.5,
    left: -width * 0.2,
  },
  bgCircleSmall: {
    width: width * 0.9,
    height: width * 0.9,
    bottom: -width * 0.3,
    right: -width * 0.2,
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 32,
  },
  logoWrapper: {
    marginBottom: 24,
  },
  logoRingOuter: {
    width: 136,
    height: 136,
    borderRadius: 68,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoRingInner: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoImage: {
    width: 88,
    height: 88,
    borderRadius: 20,
  },
  logoFallback: {
    width: 88,
    height: 88,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  appName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: 0.4,
    textAlign: "center",
    marginBottom: 16,
  },
  divider: {
    width: 48,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.35)",
    borderRadius: 2,
    marginBottom: 24,
  },
  welcomeLabel: {
    fontSize: 15,
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
    fontWeight: "500",
    marginBottom: 6,
  },
  userName: {
    fontSize: 30,
    fontWeight: "800",
    color: "#ffffff",
    textAlign: "center",
    letterSpacing: -0.5,
    marginBottom: 14,
  },
  roleBadgeRow: {
    alignItems: "center",
    marginBottom: 20,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  roleBadgeText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  subText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    fontWeight: "400",
  },
  dotsContainer: {
    position: "absolute",
    bottom: 52,
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.8)",
  },
});

export default PostLoginSplashScreen;