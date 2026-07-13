import React, { useState, useEffect } from "react";
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
import { Lock, ArrowLeft, KeyRound, Eye, EyeOff } from "lucide-react-native";

import { useTheme } from "../../theme";
import AuthService from "../../services/auth.service";
import { resetPasswordSchema, ResetPasswordInput } from "../../validation/auth.validation";
import { AuthStackParamList } from "../../types/navigation.types";
import { AppInput } from "../../components/AppInput";
import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";

type RouteProps = RouteProp<AuthStackParamList, "ResetPassword">;
type NavigationProp = NativeStackNavigationProp<AuthStackParamList, "ResetPassword">;

export const ResetPasswordScreen = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { token: routeToken = "", email = "" } = route.params || {};

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    mode: "onChange",
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: routeToken,
      password: "",
      confirmPassword: "",
    },
  });

  const passwordVal = watch("password");
  const confirmPasswordVal = watch("confirmPassword");

  const isButtonDisabled =
    loading ||
    !passwordVal ||
    passwordVal.trim() === "" ||
    !confirmPasswordVal ||
    confirmPasswordVal.trim() === "" ||
    passwordVal !== confirmPasswordVal ||
    passwordVal.length < 8;

  useEffect(() => {
    if (routeToken) {
      setValue("token", routeToken);
    }
  }, [routeToken, setValue]);

  const onSubmit = async (data: ResetPasswordInput) => {
    setLoading(true);
    setError(null);
    try {
      console.log("Calling Reset Password API...");
      const res = await AuthService.resetPassword(data.token, data.password);
      console.log("Reset API Success", res);
      setLoading(false);
      
      console.log("Navigation Triggered");
      console.log("Route Found: Login");
      
      Alert.alert("Success", "Password reset successfully.", [
        {
          text: "OK",
          onPress: () => {
            navigation.reset({
              index: 0,
              routes: [{ name: "Login", params: { email, successBanner: true } }],
            });
          },
        },
      ]);
    } catch (err: any) {
      console.error("Reset Password API Exception:", err);
      setLoading(false);
      setError(err?.message || "Failed to reset password. Please try again.");
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
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft color={theme.colors.text} size={24} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>New Password</Text>
        </View>

        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
          Please enter your secure reset token and your new password configuration below.
        </Text>

        <AppCard style={styles.formCard}>
          {(error || errors.token) && (
            <View style={[styles.errorContainer, { backgroundColor: `${theme.colors.danger}12` }]}>
              <Text style={[styles.errorText, { color: theme.colors.danger }]}>
                {error || errors.token?.message}
              </Text>
            </View>
          )}

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppInput
                label="New Password"
                placeholder="Minimum 8 characters"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                secureTextEntry={!showPassword}
                error={errors.password?.message}
                autoCapitalize="none"
                leftIcon={<Lock size={20} color={theme.colors.textLight} />}
                rightIcon={
                  <Pressable onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                    {showPassword ? (
                      <EyeOff size={20} color={theme.colors.textMuted} />
                    ) : (
                      <Eye size={20} color={theme.colors.textMuted} />
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
                label="Confirm New Password"
                placeholder="Retype password details"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                secureTextEntry={!showConfirmPassword}
                error={errors.confirmPassword?.message}
                autoCapitalize="none"
                leftIcon={<Lock size={20} color={theme.colors.textLight} />}
                rightIcon={
                  <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={{ padding: 4 }}>
                    {showConfirmPassword ? (
                      <EyeOff size={20} color={theme.colors.textMuted} />
                    ) : (
                      <Eye size={20} color={theme.colors.textMuted} />
                    )}
                  </Pressable>
                }
              />
            )}
          />

          <AppButton
            title="Reset Password"
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            disabled={isButtonDisabled}
            style={{ marginTop: 16 }}
          />
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
    marginBottom: 12,
  },
  backButton: {
    padding: 4,
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
});
export default ResetPasswordScreen;
