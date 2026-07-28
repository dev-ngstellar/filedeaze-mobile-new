/**
 * Formats a string to Title Case.
 */
export function toTitleCase(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Strips formatting characters from phone number.
 */
export function cleanPhoneNumber(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculates warranty status based on warranty expiration date.
 */
export function getWarrantyStatus(warrantyExpiresAt: string | null | undefined): { label: string; badgeBg: string } {
  if (!warrantyExpiresAt) {
    return { label: "Out of Warranty", badgeBg: "#ef4444" };
  }
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(warrantyExpiresAt);
    expiry.setHours(0, 0, 0, 0);
    if (today <= expiry) {
      return { label: "Warranty", badgeBg: "#22c55e" };
    }
  } catch {
    // Return Out of Warranty in case of parse errors
  }
  return { label: "Out of Warranty", badgeBg: "#ef4444" };
}

/**
 * Maps login API errors to user-friendly authentication error messages according to BUG-TECH-LOGIN-001 requirements.
 */
export function getFriendlyAuthErrorMessage(err: any): string {
  const status = err?.status ?? err?.response?.status;
  const rawMsg = typeof err === "string" ? err : (err?.message || err?.response?.data?.message || "");
  const msg = rawMsg.toLowerCase();

  // 1. Network failures (Network OFF, offline, timeout, status 0, Network Error)
  const isNetworkFailure =
    status === 0 ||
    msg.includes("network error") ||
    msg.includes("network") ||
    msg.includes("fetch") ||
    msg.includes("connect") ||
    msg.includes("econnrefused") ||
    msg.includes("timeout") ||
    msg.includes("offline");

  if (isNetworkFailure) {
    return "Unable to connect. Please check your internet connection.";
  }

  // 2. Server Errors (HTTP 500, 502, 503, 504, etc.)
  if (typeof status === "number" && status >= 500) {
    return "Something went wrong.";
  }

  // 3. User / Account not found / Email not registered
  const isUserNotFound =
    status === 404 ||
    msg.includes("user not found") ||
    msg.includes("customer not found") ||
    msg.includes("technician not found") ||
    msg.includes("email not registered") ||
    msg.includes("account not found") ||
    msg.includes("no account") ||
    msg.includes("no user") ||
    msg.includes("does not exist") ||
    msg.includes("not registered");

  if (isUserNotFound) {
    return "No account found with this email address.";
  }

  // 4. Authentication / Credential / 401 errors
  const isAuthError =
    status === 401 ||
    msg.includes("invalid") ||
    msg.includes("credential") ||
    msg.includes("password") ||
    msg.includes("unauthorized") ||
    msg.includes("authentication failed") ||
    msg.includes("auth failed") ||
    msg.includes("incorrect") ||
    msg.includes("failed");

  if (isAuthError) {
    return "Invalid email or password.";
  }

  // Fallback for any other client errors (400-499)
  if (typeof status === "number" && status >= 400 && status < 500) {
    return "Invalid email or password.";
  }

  // Server error fallback
  return "Something went wrong.";
}

export * from "./location";

export default { toTitleCase, cleanPhoneNumber, sleep, getWarrantyStatus, getFriendlyAuthErrorMessage };
