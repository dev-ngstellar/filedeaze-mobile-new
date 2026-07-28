import axios, { InternalAxiosRequestConfig } from "axios";
import { APP_CONFIG } from "../config/app.config";
import { useAuthStore } from "../store/auth.store";

// Create configured Axios Instance
export const apiClient = axios.create({
  baseURL: APP_CONFIG.apiBaseUrl,
  timeout: APP_CONFIG.timeoutMs,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Request Interceptor to append Authorization & Tenant Headers
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get state from Zustand store
    const { token } = useAuthStore.getState();

    // Attach Tenant identifier header
    config.headers["x-tenant-code"] = APP_CONFIG.tenantCode;

    // Attach JWT token
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

let _isRefreshing = false;
let _refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  _refreshSubscribers.push(cb);
};

const onTokenRefreshed = (token: string) => {
  _refreshSubscribers.forEach((cb) => cb(token));
  _refreshSubscribers = [];
};

// Response Interceptor for global error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      const url: string = originalRequest.url || "";
      const isAuthEndpoint = url.includes("/auth/");

      if (isAuthEndpoint) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      const { refreshToken, logout } = useAuthStore.getState();

      if (refreshToken) {
        if (!_isRefreshing) {
          _isRefreshing = true;
          try {
            const refreshResponse = await axios.post(
              `${APP_CONFIG.apiBaseUrl}/auth/refresh`,
              { refreshToken },
              {
                headers: {
                  "Content-Type": "application/json",
                  Accept: "application/json",
                  "x-tenant-code": APP_CONFIG.tenantCode,
                },
              }
            );

            const dataObj = refreshResponse.data?.data || refreshResponse.data;
            const newAccessToken = dataObj?.tokens?.accessToken || dataObj?.accessToken;
            const newRefreshToken = dataObj?.tokens?.refreshToken || dataObj?.refreshToken;

            if (newAccessToken) {
              useAuthStore.setState({
                token: newAccessToken,
                refreshToken: newRefreshToken || refreshToken,
              });

              _isRefreshing = false;
              onTokenRefreshed(newAccessToken);
            } else {
              throw new Error("Invalid refresh response");
            }
          } catch (refreshErr: any) {
            _isRefreshing = false;
            _refreshSubscribers = [];
            if (refreshErr?.response?.status === 401 || refreshErr?.response?.status === 403) {
              logout();
            }
            return Promise.reject(new Error("Your session has expired. Please log in again."));
          }
        }

        const retryOrigRequest = new Promise((resolve) => {
          subscribeTokenRefresh((token) => {
            originalRequest.headers["Authorization"] = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          });
        });

        return retryOrigRequest;
      } else {
        // No refresh token available
        return Promise.reject(new Error("Authentication token required."));
      }
    }

    let errorMessage = "Something went wrong. Please try again.";
    const respMessage = error.response?.data?.message;

    if (Array.isArray(respMessage) && respMessage.length > 0) {
      errorMessage = respMessage.join("\n");
    } else if (typeof respMessage === "string" && respMessage.trim()) {
      errorMessage = respMessage;
    } else if (error.message && typeof error.message === "string") {
      errorMessage = error.message;
    }

    return Promise.reject(new Error(errorMessage));
  }
);
