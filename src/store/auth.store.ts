import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AuthService from "../services/auth.service";
import { unregisterDeviceToken } from "../services/notificationService";

import { getFriendlyAuthErrorMessage } from "../utils";

export type UserRole = "CUSTOMER" | "TECHNICIAN" | "ADMIN" | "SUPER_ADMIN";

export interface UserProfile {
  id: string;
  name: string;
  mobile: string;
  role: UserRole;
  email?: string;
  avatar?: string;
}

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  refreshToken: string | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  _hasHydrated: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  setHasHydrated: (val: boolean) => void;
  updateAvatar: (url: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      role: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      _hasHydrated: false,

      setHasHydrated: (val: boolean) => set({ _hasHydrated: val }),
      updateAvatar: (url: string) => set((state) => ({ user: state.user ? { ...state.user, avatar: url } : null })),

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const res = await AuthService.login(email, password);

          const userProfile: UserProfile = {
            id: res.user.id,
            name: res.user.name,
            mobile: res.user.mobile,
            role: res.user.role,
            email: res.user.email,
            avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop",
          };

          set({
            user: userProfile,
            token: res.token,
            refreshToken: res.refreshToken,
            role: res.user.role,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (err: any) {
          set({
            isLoading: false,
            error: getFriendlyAuthErrorMessage(err),
          });
          throw err;
        }
      },

      logout: () => {
        const token = get().token;
        if (token) {
          unregisterDeviceToken(token).catch(console.error);
        }
        set({
          user: null,
          token: null,
          refreshToken: null,
          role: null,
          isAuthenticated: false,
          error: null,
        });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "fieldeaze-auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        role: state.role,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

setTimeout(() => {
  if (!useAuthStore.getState()._hasHydrated) {
    useAuthStore.setState({ _hasHydrated: true });
  }
}, 2000);

export default useAuthStore;
