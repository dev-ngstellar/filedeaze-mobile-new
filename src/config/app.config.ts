import { Platform } from "react-native";
import Constants from "expo-constants";

const getApiBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  // When running in a web browser on localhost (Expo web), route through the local Metro dev server proxy
  // to avoid browser CORS errors caused by backend origin whitelist.
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
    if (isLocalhost) {
      return `${window.location.origin}/api/v1`;
    }
  }
  // Live production backend API (for native Android/iOS apps and production web)
  return "https://api-fieldeaze.ngstellar.com/api/v1";
};

export const APP_CONFIG = {
  // Production credentials - Avanthika solutions Ltd
  tenantId: "5c9a1ec2-399b-4393-ac40-ba1ea5417de6",
  tenantCode: "avanthikasolutions",
  appName: "Avanthika solutions Ltd",

  // Local development credentials (ABC Services Pvt. Ltd)
  // tenantId: "8c950efc-97fe-4409-a941-1684b46e3ed9",
  // tenantCode: "abcservicepvtltd001",
  // appName: "ABC Services Pvt. Ltd",

  // Production credentials
  //tenantId: "efc04d93-724b-46c9-b037-63468be9ba04",
  //tenantCode: "techserves",    
  //appName: "Tech Serves",

  apiBaseUrl: getApiBaseUrl(),
  timeoutMs: 15000,
};

