import { apiClient } from "../api/client";
import { APP_CONFIG } from "../config/app.config";

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
   * Unified Login (tries customer first, falls back to technician)
   */
  static async login(email: string, password: string): Promise<LoginResponse> {
    return new Promise((resolve, reject) => {
      let resolved = false;
      let rejectedCount = 0;
      const errors: any[] = [];

      const handleSuccess = (res: LoginResponse) => {
        if (!resolved) {
          resolved = true;
          resolve(res);
        }
      };

      const handleFailure = (err: any) => {
        rejectedCount++;
        const statusCode = err.response?.status || err.status;
        const errorMessage = err.response?.data?.message || err.message;
        errors.push({ status: statusCode, message: errorMessage, originalError: err });
        if (rejectedCount === 2 && !resolved) {
          // Both failed, throw user-friendly error
          const firstErr = errors[0];
          const secondErr = errors[1];
          const msg = firstErr.message === secondErr.message ? firstErr.message : `${firstErr.message} / ${secondErr.message}`;
          const customErr: any = new Error(msg || "Invalid credentials.");
          customErr.status = firstErr.status || secondErr?.status;
          customErr.response = firstErr.originalError?.response || secondErr?.originalError?.response;
          reject(customErr);
        }
      };

      // 1. Try customer login
      apiClient.post("/auth/customer/login", {
        tenantId: APP_CONFIG.tenantId,
        email,
        password,
      }).then((response) => {
        const { user, tokens } = response.data.data;
        handleSuccess({
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
        });
      }).catch((err) => {
        handleFailure(err);
      });

      // 2. Try technician login
      apiClient.post("/auth/technician/login", {
        tenantId: APP_CONFIG.tenantId,
        email,
        password,
      }).then((response) => {
        const { user, tokens } = response.data.data;
        handleSuccess({
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
        });
      }).catch((err) => {
        handleFailure(err);
      });
    });
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
