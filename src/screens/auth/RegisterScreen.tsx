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
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { User, Phone, Lock, ArrowLeft, Mail, MapPin, Eye, EyeOff } from "lucide-react-native";

import { useTheme } from "../../theme";
import AuthService from "../../services/auth.service";
import { registerSchema, RegisterInput } from "../../validation/auth.validation";
import { AuthStackParamList } from "../../types/navigation.types";
import { AppInput } from "../../components/AppInput";
import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { APP_CONFIG } from "../../config/app.config";

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, "Register">;

export const RegisterScreen = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    control,
    getValues,
    setError: setFormError,
    clearErrors,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      mobile: "",
      email: "",
      password: "",
      confirmPassword: "",
      address: "",
    },
  });

  const handleRegisterPress = async () => {
    if (loading) return;
    setError(null);

    const values = getValues();
    const cleanName = (values.name || "").trim();
    const cleanMobile = (values.mobile || "").trim();
    const cleanEmail = (values.email || "").trim();
    const cleanPassword = values.password || "";
    const cleanConfirmPassword = values.confirmPassword || "";
    const cleanAddress = (values.address || "").trim();

    const formErrors: Record<string, string> = {};

    if (!cleanName || cleanName.length < 2) {
      formErrors.name = "Name must be at least 2 characters";
    }

    if (!cleanMobile || !/^\d{10}$/.test(cleanMobile)) {
      formErrors.mobile = "Mobile number must be 10 digits";
    }

    const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
      formErrors.email = "Please enter a valid email address.";
    }

    if (!cleanPassword || cleanPassword.length < 8 || !/[a-zA-Z]/.test(cleanPassword) || !/\d/.test(cleanPassword)) {
      formErrors.password = "Password must be at least 8 characters with letters & numbers";
    }

    if (cleanPassword !== cleanConfirmPassword) {
      formErrors.confirmPassword = "Passwords do not match.";
    }

    if (!cleanAddress) {
      formErrors.address = "Service Address is required";
    }

    if (Object.keys(formErrors).length > 0) {
      Object.entries(formErrors).forEach(([field, msg]) => {
        setFormError(field as any, { type: "manual", message: msg });
      });
      const firstErrorMsg = Object.values(formErrors)[0];
      setError(firstErrorMsg);
      Alert.alert("Validation Error", firstErrorMsg);
      return;
    }

    clearErrors();
    setLoading(true);

    try {
      const formattedMobile = `+91${cleanMobile}`;
      await AuthService.registerCustomer({
        name: cleanName,
        email: cleanEmail,
        mobile: formattedMobile,
        password: cleanPassword,
      });
      setLoading(false);
      Alert.alert(
        "Verification Required",
        "An OTP code has been sent to your email address. Please verify to activate your account."
      );
      navigation.navigate("OtpVerification", {
        email: cleanEmail,
        mobile: formattedMobile,
        mode: "register",
        name: cleanName,
        password: cleanPassword,
        address: cleanAddress,
        tenantId: APP_CONFIG.tenantId,
      });
    } catch (err: any) {
      setLoading(false);
      const status = err?.status || err?.response?.status;
      const msg = (err?.message || "").toLowerCase();
      const dataMsg = (err?.response?.data?.message || err?.data?.message || "").toLowerCase();
      const fullErr = `${msg} ${dataMsg}`;

      let friendlyMsg = "Something went wrong. Please try again.";

      if (fullErr.includes("email") && (fullErr.includes("exist") || fullErr.includes("already") || fullErr.includes("registered") || status === 409)) {
        friendlyMsg = "This email is already registered.";
        setFormError("email", { type: "manual", message: friendlyMsg });
      } else if ((fullErr.includes("mobile") || fullErr.includes("phone")) && (fullErr.includes("exist") || fullErr.includes("already") || fullErr.includes("registered") || status === 409)) {
        friendlyMsg = "This mobile number is already registered.";
        setFormError("mobile", { type: "manual", message: friendlyMsg });
      } else if (msg.includes("network") || msg.includes("fetch") || msg.includes("connect") || msg.includes("econnrefused") || status === 0) {
        friendlyMsg = "Unable to connect. Please check your internet connection.";
      } else {
        friendlyMsg = "Something went wrong. Please try again.";
      }

      setError(friendlyMsg);
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
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: theme.colors.background }]}>
            <ArrowLeft color={theme.colors.text} size={20} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Create Account</Text>
        </View>

        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
          Register to book services and track your requests in real-time.
        </Text>

        <AppCard style={styles.formCard}>
          {error && (
            <View style={[styles.errorContainer, { backgroundColor: `${theme.colors.danger}12` }]}>
              <Text style={[styles.errorText, { color: theme.colors.danger }]}>{error}</Text>
            </View>
          )}

          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppInput
                label="Full Name *"
                placeholder="e.g. Raj Kumar"
                value={value}
                onBlur={onBlur}
                onChangeText={(val) => {
                  onChange(val);
                  if (errors.name) clearErrors("name");
                }}
                error={errors.name?.message}
                autoCapitalize="words"
                leftIcon={<User size={20} color={theme.colors.textLight} />}
              />
            )}
          />

          <Controller
            control={control}
            name="mobile"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppInput
                label="Mobile Number *"
                placeholder="10-digit mobile number"
                value={value}
                onBlur={onBlur}
                onChangeText={(val) => {
                  onChange(val.replace(/\D/g, "").slice(0, 10));
                  if (errors.mobile) clearErrors("mobile");
                }}
                error={errors.mobile?.message}
                keyboardType="phone-pad"
                maxLength={10}
                leftIcon={<Phone size={20} color={theme.colors.textLight} />}
              />
            )}
          />

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppInput
                label="Email Address *"
                placeholder="e.g. customer@email.com"
                value={value}
                onBlur={onBlur}
                onChangeText={(val) => {
                  onChange(val);
                  if (errors.email) clearErrors("email");
                }}
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
                label="Password *"
                placeholder="Minimum 8 characters"
                value={value}
                onBlur={onBlur}
                onChangeText={(val) => {
                  onChange(val);
                  if (errors.password) clearErrors("password");
                }}
                secureTextEntry={!showPassword}
                error={errors.password?.message}
                autoCapitalize="none"
                leftIcon={<Lock size={20} color={theme.colors.textLight} />}
                rightIcon={
                  <Pressable onPress={() => setShowPassword((prev) => !prev)} style={{ padding: 4 }}>
                    {showPassword ? (
                      <EyeOff size={18} color={theme.colors.textMuted} />
                    ) : (
                      <Eye size={18} color={theme.colors.textMuted} />
                    )}
                  </Pressable>
                }
              />
            )}
          />

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppInput
                label="Confirm Password *"
                placeholder="Confirm your password"
                value={value}
                onBlur={onBlur}
                onChangeText={(val) => {
                  onChange(val);
                  if (errors.confirmPassword) clearErrors("confirmPassword");
                }}
                secureTextEntry={!showConfirmPassword}
                error={errors.confirmPassword?.message}
                autoCapitalize="none"
                leftIcon={<Lock size={20} color={theme.colors.textLight} />}
                rightIcon={
                  <Pressable onPress={() => setShowConfirmPassword((prev) => !prev)} style={{ padding: 4 }}>
                    {showConfirmPassword ? (
                      <EyeOff size={18} color={theme.colors.textMuted} />
                    ) : (
                      <Eye size={18} color={theme.colors.textMuted} />
                    )}
                  </Pressable>
                }
              />
            )}
          />

          <Controller
            control={control}
            name="address"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppInput
                label="Service Address *"
                placeholder="Enter complete address detail"
                value={value}
                onBlur={onBlur}
                onChangeText={(val) => {
                  onChange(val);
                  if (errors.address) clearErrors("address");
                }}
                error={errors.address?.message}
                leftIcon={<MapPin size={20} color={theme.colors.textLight} />}
              />
            )}
          />

          <AppButton
            title={loading ? "Registering..." : "Register"}
            onPress={handleRegisterPress}
            loading={loading}
            disabled={loading}
            style={{ marginTop: 16 }}
          />
        </AppCard>

        <Pressable onPress={() => navigation.navigate("Login")} style={styles.loginLink}>
          <Text style={{ fontSize: 13, color: theme.colors.textMuted }}>
            Already have an account?{" "}
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

export default RegisterScreen;
