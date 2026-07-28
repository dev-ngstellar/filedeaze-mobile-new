import * as Location from "expo-location";

export interface AttendanceCoordinates {
  latitude: number;
  longitude: number;
}

/**
 * Captures fresh GPS location for attendance (Check In / Check Out).
 * Checks foreground permissions and GPS services before fetching high-accuracy coordinates.
 * Prevents cached/hardcoded location usage and handles all error conditions per BUG-TECH-ATT-001.
 */
export async function getFreshLocationForAttendance(): Promise<AttendanceCoordinates> {
  // 1. Request/verify location permission
  let perm;
  try {
    perm = await Location.requestForegroundPermissionsAsync();
  } catch {
    throw new Error("Location permission is required to mark attendance.");
  }

  if (!perm || perm.status !== "granted") {
    throw new Error("Location permission is required to mark attendance.");
  }

  // 2. Check if device location / GPS services are enabled
  let isServicesEnabled = false;
  try {
    isServicesEnabled = await Location.hasServicesEnabledAsync();
  } catch {
    throw new Error("Please enable your device location.");
  }

  if (!isServicesEnabled) {
    throw new Error("Please enable your device location.");
  }

  // 3. Request fresh current location (no caching)
  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    if (!location || !location.coords) {
      throw new Error("Unable to get your current location. Please try again.");
    }

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (err: any) {
    const msg = (err?.message || "").toLowerCase();
    if (
      msg.includes("disabled") ||
      msg.includes("provider") ||
      msg.includes("service") ||
      msg.includes("settings")
    ) {
      throw new Error("Please enable your device location.");
    }
    if (msg.includes("permission") || msg.includes("denied")) {
      throw new Error("Location permission is required to mark attendance.");
    }
    throw new Error("Unable to get your current location. Please try again.");
  }
}
