import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  Alert,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { KeyRound, ArrowLeft } from "lucide-react-native";

import { useTheme } from "../../theme";
import { useAuthStore } from "../../store/auth.store";
import AuthService from "../../services/auth.service";
import { apiClient } from "../../api/client";
import { otpSchema, OtpInput } from "../../validation/auth.validation";
import { AuthStackParamList } from "../../types/navigation.types";
import { AppInput } from "../../components/AppInput";
import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";

type RouteProps = RouteProp<AuthStackParamList, "OtpVerification">;
type NavigationProp = NativeStackNavigationProp<AuthStackParamList, "OtpVerification">;

export const OtpVerificationScreen = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const { email, mode, address, tenantId } = route.params;

  React.useEffect(() => {
    if (resendCountdown === 0) return;
    const interval = setInterval(() => {
      setResendCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCountdown]);

  const {
    control,
    getValues,
    setError: setFormError,
    clearErrors,
    formState: { errors },
  } = useForm<OtpInput>({
    resolver: zodResolver(otpSchema),
    mode: "onChange",
    defaultValues: {
      otp: "",
    },
  });

  const handleVerifyOtp = async () => {
    if (loading) return;
    setError(null);

    const values = getValues();
    const rawOtp = values.otp || "";
    const cleanOtp = rawOtp.trim();

    let validationError = "";

    if (!cleanOtp) {
      validationError = "OTP is required.";
    } else if (!/^\d+$/.test(cleanOtp)) {
      validationError = "OTP must contain only numbers.";
    } else if (cleanOtp.length !== 6) {
      validationError = "OTP must be 6 digits.";
    }

    if (validationError) {
      setFormError("otp", { type: "manual", message: validationError });
      setError(validationError);
      Alert.alert("Code Required", validationError);
      return;
    }

    clearErrors("otp");
    setLoading(true);

    try {
      if (mode === "register") {
        const loginRes = await AuthService.verifyOtp(email, cleanOtp, tenantId);
        if (address) {
          try {
            await apiClient.post(
              "/mobile/customer/addresses",
              {
                street: address,
                city: "Local",
                label: "home",
              },
              {
                headers: {
                  Authorization: `Bearer ${loginRes.token}`,
                },
              }
            );
          } catch (addrErr) {
            console.error("Failed to save customer address:", addrErr);
          }
        }

        const userProfile = {
          id: loginRes.user.id,
          name: loginRes.user.name,
          mobile: loginRes.user.mobile,
          role: loginRes.user.role as any,
          email: loginRes.user.email,
          avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop",
        };

        useAuthStore.setState({
          user: userProfile,
          token: loginRes.token,
          refreshToken: loginRes.refreshToken,
          role: loginRes.user.role as any,
          isAuthenticated: true,
        });

        setLoading(false);
      } else {
        const res = await AuthService.verifyForgotPasswordOtp(email, cleanOtp);
        setLoading(false);
        navigation.navigate("ResetPassword", { email, token: res.resetToken });
      }
    } catch (err: any) {
      setLoading(false);
      const backendErrorMsg = "Invalid verification code. Please enter the correct code.";
      setError(backendErrorMsg);
      setFormError("otp", { type: "manual", message: backendErrorMsg });
    }
  };

  const handleResendOtp = async () => {
    if (resending || resendCountdown > 0) return;
    setResending(true);
    setError(null);
    try {
      if (mode === "forgot_password") {
        await AuthService.forgotPassword(email, tenantId);
      } else {
        await AuthService.resendOtp(email, tenantId);
      }
      Alert.alert("Code Resent", "A new verification code has been sent to your email address.");
      setResendCountdown(30);
    } catch (err: any) {
      setError("Unable to resend code. Please try again.");
      Alert.alert("Unable to Resend", "We couldn't resend the verification code. Please try again.");
    } finally {
      setResending(false);
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
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: theme.colors.background }]}>
            <ArrowLeft color={theme.colors.text} size={20} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Verify Your Account</Text>
        </View>

        <View style={[styles.otpIconWrap, { backgroundColor: `${theme.colors.primary}10` }]}>
          <KeyRound size={32} color={theme.colors.primary} />
        </View>

        <View style={[styles.emailHighlight, { backgroundColor: `${theme.colors.primary}08`, borderColor: `${theme.colors.primary}20` }]}>
          <Text style={[styles.emailHighlightText, { color: theme.colors.textMuted }]}>
            Verification code sent to
          </Text>
          <Text style={[styles.emailHighlightAddr, { color: theme.colors.text }]}>{email}</Text>
        </View>

        <AppCard style={styles.formCard}>
          {error && (
            <View style={[styles.errorContainer, { backgroundColor: `${theme.colors.danger}12` }]}>
              <Text style={[styles.errorText, { color: theme.colors.danger }]}>{error}</Text>
            </View>
          )}

          <Controller
            control={control}
            name="otp"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppInput
                label="Verification Code (OTP) *"
                placeholder="Enter 6-digit code"
                value={value}
                onBlur={onBlur}
                onChangeText={(val) => {
                  onChange(val);
                  if (errors.otp) clearErrors("otp");
                  if (error) setError(null);
                }}
                error={errors.otp?.message || error || undefined}
                keyboardType="number-pad"
                maxLength={6}
                leftIcon={<KeyRound size={20} color={theme.colors.textLight} />}
              />
            )}
          />

          <AppButton
            title={loading ? "Verifying..." : "Verify Code"}
            onPress={handleVerifyOtp}
            loading={loading}
            disabled={loading}
            style={{ marginTop: 16 }}
          />

          <Pressable
            disabled={resending || resendCountdown > 0}
            onPress={handleResendOtp}
            style={({ pressed }) => [
              { marginTop: 16, alignItems: "center" },
              (resending || resendCountdown > 0) && { opacity: 0.5 },
              pressed && !(resending || resendCountdown > 0) && { opacity: 0.7 }
            ]}
          >
            <Text style={{ fontSize: 13, color: theme.colors.primary, fontWeight: "600" }}>
              {resending
                ? "Resending..."
                : resendCountdown > 0
                  ? `Resend Code in ${resendCountdown}s`
                  : "Resend Verification Code"}
            </Text>
          </Pressable>
        </AppCard>
      </ScrollView>
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  otpIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 20,
  },
  emailHighlight: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginBottom: 24,
  },
  emailHighlightText: {
    fontSize: 12,
    marginBottom: 4,
  },
  emailHighlightAddr: {
    fontSize: 14,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 24,
    paddingLeft: 4,
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
});

export default OtpVerificationScreen;
