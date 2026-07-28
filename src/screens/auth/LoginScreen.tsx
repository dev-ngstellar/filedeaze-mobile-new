import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  TouchableOpacity,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Shield, Mail, Lock, Eye, EyeOff } from "lucide-react-native";

import { useTheme } from "../../theme";
import { useAuthStore } from "../../store/auth.store";
import { APP_CONFIG } from "../../config/app.config";
import { getFriendlyAuthErrorMessage } from "../../utils";
import { customerLoginSchema, CustomerLoginInput } from "../../validation/auth.validation";
import { AuthStackParamList } from "../../types/navigation.types";
import { AppInput } from "../../components/AppInput";
import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, "Login">;
type RouteProps = RouteProp<AuthStackParamList, "Login">;

export const LoginScreen = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { login, isLoading, error } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

  const { email: routeEmail = "", successBanner = false } = route.params || {};
  const passwordInputRef = useRef<TextInput>(null);

  const [validationPopupVisible, setValidationPopupVisible] = useState(false);
  const [validationPopupMsg, setValidationPopupMsg] = useState("");

  const {
    control,
    handleSubmit,
    setValue,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<CustomerLoginInput>({
    resolver: zodResolver(customerLoginSchema),
    defaultValues: {
      email: routeEmail,
      password: "",
    },
  });

  useEffect(() => {
    if (routeEmail) {
      setValue("email", routeEmail);
    }
    if (successBanner) {
      setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 300);
    }
  }, [routeEmail, successBanner, setValue]);

  const onSubmit = async (data: CustomerLoginInput) => {
    try {
      await login(data.email, data.password);
    } catch {
      // Error handled by store and displayed via UI
    }
  };

  const onPressSignIn = async () => {
    if (isLoading) return;
    const currentValues = getValues();
    const cleanEmail = (currentValues.email || "").trim();
    const cleanPassword = currentValues.password || "";

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setValidationPopupMsg("Please enter a valid email address.");
      setValidationPopupVisible(true);
      trigger("email");
      return;
    }

    if (!cleanPassword) {
      setValidationPopupMsg("Password is required.");
      setValidationPopupVisible(true);
      trigger("password");
      return;
    }

    try {
      await login(cleanEmail, cleanPassword);
    } catch (err: any) {
      const friendlyMsg = getFriendlyAuthErrorMessage(err);
      setValidationPopupMsg(friendlyMsg);
      setValidationPopupVisible(true);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerSection}>
          {(APP_CONFIG as any).logo ? (
            <View style={[styles.logoRing, { borderColor: `${theme.colors.primary}30` }]}>
              <Image source={{ uri: (APP_CONFIG as any).logo }} style={styles.logo} />
            </View>
          ) : (
            <View style={[styles.logoRing, { borderColor: `${theme.colors.primary}28` }]}>
              <View style={[styles.logoPlaceholder, { backgroundColor: theme.colors.primary }]}>
                <Shield color="#ffffff" size={36} />
              </View>
            </View>
          )}
          <Text style={[styles.appName, { color: theme.colors.text, fontSize: theme.typography.fontSize.xxl }]}>
            {APP_CONFIG.appName}
          </Text>
          <View style={[styles.welcomePill, { backgroundColor: `${theme.colors.primary}10` }]}>
            <Text style={[styles.welcomeText, { color: theme.colors.primary, fontSize: 13 }]}>
              Welcome Back 👋
            </Text>
          </View>
          <Text style={[styles.tagline, { color: theme.colors.textMuted }]}>
            Sign in to manage your services
          </Text>
        </View>

         <AppCard style={styles.formCard}>
          {successBanner && (
            <View style={[styles.successBannerContainer, { backgroundColor: `${theme.colors.success}12`, borderColor: theme.colors.success }]}>
              <Text style={[styles.successBannerTitle, { color: theme.colors.success }]}>Password Reset Successful</Text>
              <Text style={[styles.successBannerText, { color: theme.colors.text }]}>Please sign in with your new password.</Text>
            </View>
          )}

          {error && (
            <View style={[styles.errorContainer, { backgroundColor: `${theme.colors.danger}12` }]}>
              <Text style={[styles.errorText, { color: theme.colors.danger }]}>{error}</Text>
            </View>
          )}

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppInput
                label="Email Address"
                placeholder="Enter registered email"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.email?.message}
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon={<Mail size={20} color={theme.colors.textLight} />}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppInput
                ref={passwordInputRef}
                label="Password"
                placeholder="Enter password"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                secureTextEntry={!showPassword}
                error={errors.password?.message}
                autoCapitalize="none"
                leftIcon={<Lock size={20} color={theme.colors.textLight} />}
                rightIcon={
                  <Pressable onPress={() => setShowPassword(p => !p)} style={{ padding: 4 }}>
                    {showPassword
                      ? <EyeOff size={18} color={theme.colors.textMuted} />
                      : <Eye size={18} color={theme.colors.textMuted} />}
                  </Pressable>
                }
              />
            )}
          />

          <AppButton
            title="Sign In"
            onPress={onPressSignIn}
            loading={isLoading}
            style={{ marginTop: 16 }}
          />

          <View style={styles.linksRow}>
            <Pressable onPress={() => navigation.navigate("ForgotPassword")}>
              <Text style={[styles.linkText, { color: theme.colors.primary }]}>Forgot Password?</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate("Register")}>
              <Text style={[styles.linkText, { color: theme.colors.primary }]}>Create Account</Text>
            </Pressable>
          </View>
        </AppCard>
      </ScrollView>

      <Modal visible={validationPopupVisible} transparent animationType="fade" onRequestClose={() => setValidationPopupVisible(false)}>
        <View style={styles.popupOverlay}>
          <View style={[styles.popupCard, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.popupMessage, { color: theme.colors.text }]}>{validationPopupMsg}</Text>
            <TouchableOpacity
              style={[styles.popupBtn, { backgroundColor: theme.colors.primary }]}
              onPress={() => setValidationPopupVisible(false)}
            >
              <Text style={styles.popupBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 28,
  },
  logoRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logo: {
    width: 86,
    height: 86,
    borderRadius: 22,
  },
  logoPlaceholder: {
    width: 86,
    height: 86,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  appName: {
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  welcomePill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 6,
  },
  welcomeText: {
    fontWeight: "700",
  },
  tagline: {
    fontSize: 13,
    marginTop: 2,
    textAlign: "center",
  },
  formCard: {
    width: "100%",
    padding: 20,
  },
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 18,
  },
  successBannerContainer: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  successBannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  successBannerText: {
    fontSize: 12,
    lineHeight: 16,
  },
  linksRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  linkText: {
    fontSize: 12,
    fontWeight: "600",
  },
  popupOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  popupCard: {
    width: "100%",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  popupMessage: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 20,
    fontWeight: "500",
  },
  popupBtn: {
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 10,
    alignItems: "center",
  },
  popupBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
});
export default LoginScreen;
