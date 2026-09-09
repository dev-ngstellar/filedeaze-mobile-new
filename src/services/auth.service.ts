import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient } from "../api/client";
import { APP_CONFIG } from "../config/app.config";
import { APP_CONSTANTS } from "../constants";

export interface TenantBrandingInfo {
  companyName: string;
  tenantCode: string;
  logoUrl?: string | null;
  sealUrl?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  gstNumber?: string | null;
}

let cachedTenantBranding: TenantBrandingInfo | null = null;

export interface LoginResponse {
  success: boolean;
  token: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    mobile: string;
    role: "TECHNICIAN" | "CUSTOMER";
    email?: string;
  };
}

export class AuthService {
  /**
   * Fetch current tenant branding and company info dynamically with in-memory caching
   */
  static async getTenantBranding(tenantCode?: string): Promise<TenantBrandingInfo | null> {
    if (cachedTenantBranding && (!tenantCode || cachedTenantBranding.tenantCode === tenantCode)) {
      return cachedTenantBranding;
    }
    try {
      const code =
        tenantCode ||
        (await AsyncStorage.getItem(APP_CONSTANTS.storageKeys.tenantCode)) ||
        APP_CONFIG.tenantCode;
      const response = await apiClient.get(`/auth/tenant/${code}/info`);
      if (response.data?.data) {
        cachedTenantBranding = response.data.data;
        return cachedTenantBranding;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Customer Login — Calls POST /auth/customer/login
   */
  static async customerLogin(email: string, password: string): Promise<LoginResponse> {
    const response = await apiClient.post("/auth/customer/login", {
      tenantId: APP_CONFIG.tenantId,
      email,
      password,
    });
    const { user, tokens } = response.data.data;
    return {
      success: true,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        name: user.name,
        mobile: user.phone || "",
        role: user.role,
        email: user.email,
      },
    };
  }

  /**
   * Technician Login — Calls POST /auth/technician/login
   */
  static async technicianLogin(email: string, password: string): Promise<LoginResponse> {
    const response = await apiClient.post("/auth/technician/login", {
      tenantId: APP_CONFIG.tenantId,
      email,
      password,
    });
    const { user, tokens } = response.data.data;
    return {
      success: true,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        name: user.name,
        mobile: user.phone || "",
        role: user.role,
        email: user.email,
      },
    };
  }

  private static readonly ROLE_MAP_KEY = "@user_known_role_map";

  static async getKnownRole(email: string): Promise<"CUSTOMER" | "TECHNICIAN" | null> {
    try {
      const raw = await AsyncStorage.getItem(AuthService.ROLE_MAP_KEY);
      if (!raw) return null;
      const map = JSON.parse(raw);
      return map[email.trim().toLowerCase()] || null;
    } catch {
      return null;
    }
  }

  static async saveKnownRole(email: string, role: "CUSTOMER" | "TECHNICIAN"): Promise<void> {
    try {
      const clean = email.trim().toLowerCase();
      const raw = await AsyncStorage.getItem(AuthService.ROLE_MAP_KEY);
      const map = raw ? JSON.parse(raw) : {};
      map[clean] = role;
      await AsyncStorage.setItem(AuthService.ROLE_MAP_KEY, JSON.stringify(map));
    } catch {}
  }

  /**
   * Login — Dispatches strictly to customerLogin or technicianLogin based on role
   */
  static async login(
    email: string,
    password: string,
    role?: "CUSTOMER" | "TECHNICIAN",
  ): Promise<LoginResponse> {
    const cleanEmail = email.trim().toLowerCase();

    // 1. If role is explicitly provided, use it directly
    if (role === "CUSTOMER") {
      const res = await this.customerLogin(email, password);
      await this.saveKnownRole(cleanEmail, "CUSTOMER");
      return res;
    }
    if (role === "TECHNICIAN") {
      const res = await this.technicianLogin(email, password);
      await this.saveKnownRole(cleanEmail, "TECHNICIAN");
      return res;
    }

    // 2. Check if we already know this user's role from previous logins
    const knownRole = await this.getKnownRole(cleanEmail);
    if (knownRole === "TECHNICIAN") {
      try {
        const res = await this.technicianLogin(email, password);
        await this.saveKnownRole(cleanEmail, "TECHNICIAN");
        return res;
      } catch (err: any) {
        const status = err?.response?.status || err?.status;
        if (status === 401 || status === 404) {
          const res = await this.customerLogin(email, password);
          await this.saveKnownRole(cleanEmail, "CUSTOMER");
          return res;
        }
        throw err;
      }
    }

    if (knownRole === "CUSTOMER") {
      try {
        const res = await this.customerLogin(email, password);
        await this.saveKnownRole(cleanEmail, "CUSTOMER");
        return res;
      } catch (err: any) {
        const status = err?.response?.status || err?.status;
        if (status === 401 || status === 404) {
          const res = await this.technicianLogin(email, password);
          await this.saveKnownRole(cleanEmail, "TECHNICIAN");
          return res;
        }
        throw err;
      }
    }

    // 3. Heuristic for first-time login when role is not yet cached:
    const likelyTechnician = cleanEmail.includes("tech") || cleanEmail === "raja@gamil.com";

    if (likelyTechnician) {
      try {
        const res = await this.technicianLogin(email, password);
        await this.saveKnownRole(cleanEmail, "TECHNICIAN");
        return res;
      } catch (err: any) {
        const status = err?.response?.status || err?.status;
        if (status === 401 || status === 404) {
          const res = await this.customerLogin(email, password);
          await this.saveKnownRole(cleanEmail, "CUSTOMER");
          return res;
        }
        throw err;
      }
    }

    // Default: try customer first, then technician fallback
    try {
      const res = await this.customerLogin(email, password);
      await this.saveKnownRole(cleanEmail, "CUSTOMER");
      return res;
    } catch (err: any) {
      const status = err?.response?.status || err?.status;
      if (status === 401 || status === 404) {
        const res = await this.technicianLogin(email, password);
        await this.saveKnownRole(cleanEmail, "TECHNICIAN");
        return res;
      }
      throw err;
    }
  }

  /**
   * Customer Registration
   */
  static async registerCustomer(payload: {
    name: string;
    email: string;
    mobile: string;
    password: string;
  }): Promise<{ message: string }> {
    try {
      const response = await apiClient.post("/auth/customer/register", {
        tenantId: APP_CONFIG.tenantId,
        name: payload.name,
        email: payload.email,
        phone: payload.mobile,
        password: payload.password,
        confirmPassword: payload.password,
      });

      return {
        message: response.data.message || "OTP sent to your email address.",
      };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || "Failed to register.";
      throw new Error(msg);
    }
  }

  /**
   * Customer OTP Verification
   */
  static async verifyOtp(email: string, otp: string, tenantId?: string): Promise<LoginResponse> {
    try {
      const response = await apiClient.post("/auth/customer/verify-otp", {
        tenantId: tenantId || APP_CONFIG.tenantId,
        email,
        otp,
      });

      const { user, tokens } = response.data.data;

      return {
        success: true,
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          name: user.name,
          mobile: user.phone || "",
          role: user.role,
          email: user.email,
        },
      };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || "Verification failed.";
      throw new Error(msg);
    }
  }

  /**
   * Resend OTP
   */
  static async resendOtp(email: string, tenantId?: string): Promise<{ message: string }> {
    try {
      const response = await apiClient.post("/auth/customer/resend-otp", {
        tenantId: tenantId || APP_CONFIG.tenantId,
        email,
      });

      return {
        message: response.data.message || "OTP resent successfully.",
      };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || "Failed to resend OTP.";
      throw new Error(msg);
    }
  }

  /**
   * Customer Forgot Password
   */
  static async forgotPassword(email: string, tenantId?: string): Promise<{ message: string }> {
    try {
      const response = await apiClient.post("/auth/customer/forgot-password", {
        tenantId: tenantId || APP_CONFIG.tenantId,
        email,
      });

      return {
        message: response.data.message || "Reset OTP sent to your email.",
      };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || "Failed to request reset link.";
      throw new Error(msg);
    }
  }

  /**
   * Verify Forgot Password OTP
   */
  static async verifyForgotPasswordOtp(email: string, otp: string): Promise<{ resetToken: string }> {
    const payload = {
      tenantId: APP_CONFIG.tenantId,
      email,
      otp,
    };
    console.log("verifyForgotPasswordOtp Request Payload:", JSON.stringify(payload, null, 2));
    try {
      const response = await apiClient.post("/auth/customer/verify-forgot-password-otp", payload);
      return {
        resetToken: response.data.data.resetToken,
      };
    } catch (error: any) {
      if (error.response) {
        console.log("verifyForgotPasswordOtp Response Error Body:", JSON.stringify(error.response.data, null, 2));
      } else {
        console.log("verifyForgotPasswordOtp Error Message:", error.message);
      }
      const msg = error.response?.data?.message || error.message || "Failed to verify OTP.";
      throw new Error(msg);
    }
  }

  /**
   * Customer Reset Password (using resetToken & newPassword)
   */
  static async resetPassword(resetToken: string, newPassword: string): Promise<{ message: string }> {
    try {
      const response = await apiClient.post("/auth/customer/reset-password", {
        resetToken,
        newPassword,
        confirmNewPassword: newPassword,
      });

      return {
        message: response.data.message || "Password updated successfully.",
      };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || "Failed to reset password.";
      throw new Error(msg);
    }
  }
}
export default AuthService;
