import { Platform } from "react-native";
import Constants from "expo-constants";

const getApiBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (Platform.OS === "web") {
    return "http://localhost:3000/api/v1";
  }   
  // Dynamically extract the Metro host IP (e.g. 192.168.1.8) on mobile devices
  const debuggerHost =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri;

  if (debuggerHost) {
    const hostIp = debuggerHost.split(":")[0];
    if (hostIp && hostIp !== "localhost" && hostIp !== "127.0.0.1") {
      return `http://${hostIp}:3000/api/v1`;
    }
  }

  // Fallback for native devices / emulator
  return "http://192.168.1.8:3000/api/v1";
};

export const APP_CONFIG = {
  // Production credentials
  //tenantId: "efc04d93-724b-46c9-b037-63468be9ba04",
  //tenantCode: "techserves",    
  //appName: "Tech Serves",

  // local data for development purpose use the below credentials
  tenantId: "8c950efc-97fe-4409-a941-1684b46e3ed9",
  tenantCode: "abcservicepvtltd001",
  appName: "ABC Services Pvt. Ltd",

  apiBaseUrl: getApiBaseUrl(),
  timeoutMs: 15000,
};

