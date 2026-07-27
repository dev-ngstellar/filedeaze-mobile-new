import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Mail, ArrowLeft } from "lucide-react-native";

import { useTheme } from "../../theme";
import AuthService from "../../services/auth.service";
import { forgotPasswordSchema, ForgotPasswordInput } from "../../validation/auth.validation";
import { AuthStackParamList } from "../../types/navigation.types";
import { AppInput } from "../../components/AppInput";
import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, "ForgotPassword">;

export const ForgotPasswordScreen = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    getValues,
    setError: setFormError,
    clearErrors,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
    },
  });

  const handleGenerateOtp = async () => {
    const currentValues = getValues();
    const rawEmail = currentValues.email || "";
    const cleanEmail = rawEmail.trim();

    console.log("[ForgotPasswordScreen] ==========================================");
    console.log("[ForgotPasswordScreen] Submitted Raw Email:", JSON.stringify(rawEmail));
    console.log("[ForgotPasswordScreen] Cleaned Email:", JSON.stringify(cleanEmail));

    const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const isValid = EMAIL_REGEX.test(cleanEmail);
    console.log("[ForgotPasswordScreen] Validation Result (isValid):", isValid);

    if (!isValid) {
      const errorMsg = "Please enter a valid email address.";
      console.log("[ForgotPasswordScreen] Validation Errors:", errorMsg);
      console.log("[ForgotPasswordScreen] API Function Called?: NO (Blocked by Validation)");
      console.log("[ForgotPasswordScreen] Navigation Triggered?: NO (Staying on Screen)");

      setError(errorMsg);
      setFormError("email", {
        type: "manual",
        message: errorMsg,
      });
      return;
    }

    console.log("[ForgotPasswordScreen] Validation Errors: NONE (Valid Email)");
    clearErrors("email");
    setError(null);

    if (loading) return;
    setLoading(true);

    console.log("[ForgotPasswordScreen] API Function Called?: YES -> Calling AuthService.forgotPassword(", cleanEmail, ")");
    try {
      await AuthService.forgotPassword(cleanEmail);
      console.log("[ForgotPasswordScreen] AuthService.forgotPassword SUCCESS -> Navigating to OtpVerification");
      setLoading(false);
      navigation.navigate("OtpVerification", {
        email: cleanEmail,
        mode: "forgot_password",
      });
    } catch (err: any) {
      setLoading(false);
      const apiErrorMsg = err?.message || "Please enter a valid email address.";
      console.log("[ForgotPasswordScreen] AuthService.forgotPassword FAILED:", apiErrorMsg);
      setError(apiErrorMsg);
      setFormError("email", {
        type: "manual",
        message: apiErrorMsg,
      });
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
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Reset Password</Text>
        </View>

        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
          Please enter your registered email address below to receive an account recovery reset token.
        </Text>

        <AppCard style={styles.formCard}>
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
                label="Registered Email"
                placeholder="Enter your email"
                value={value}
                onBlur={onBlur}
                onChangeText={(val) => {
                  onChange(val);
                  if (error) setError(null);
                  if (errors.email) clearErrors("email");
                }}
                error={errors.email?.message || error || undefined}
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon={<Mail size={20} color={theme.colors.textLight} />}
              />
            )}
          />

          <AppButton
            title="Generate OTP"
            onPress={handleGenerateOtp}
            loading={loading}
            disabled={loading}
            style={{ marginTop: 16 }}
          />
        </AppCard>

        <Pressable onPress={() => navigation.navigate("Login")} style={styles.loginLink}>
          <Text style={{ fontSize: 13, color: theme.colors.textMuted }}>
            Remember credentials?{" "}
            <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>Sign In</Text>
          </Text>
        </Pressable>
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
    marginBottom: 12,
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
  loginLink: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 28,
  },
});

export default ForgotPasswordScreen;
