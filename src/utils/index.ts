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
 * Maps login API errors to user-friendly authentication error messages according to UX guidelines.
 */
export function getFriendlyAuthErrorMessage(err: any): string {
  if (!err) {
    return "Something went wrong. Please try again.";
  }

  const status = err?.status ?? err?.response?.status;
  const code = String(err?.code || err?.originalError?.code || "").toUpperCase();
  const rawMsg = typeof err === "string" ? err : (err?.message || err?.response?.data?.message || "");
  const msg = rawMsg.toLowerCase();

  // 1. Timeout Case
  const isTimeout =
    code === "ECONNABORTED" ||
    code === "ETIMEDOUT" ||
    msg.includes("timeout") ||
    msg.includes("timed out");

  if (isTimeout) {
    return "Connection timed out. Please check your network and try again.";
  }

  // 2. Network Error / No Internet Case (offline, network error, no response status)
  const isNetworkError =
    code === "ERR_NETWORK" ||
    msg.includes("network error") ||
    msg.includes("no internet") ||
    msg.includes("net::err") ||
    msg.includes("offline") ||
    (status === 0 && !isTimeout) ||
    (!status && (msg.includes("failed to fetch") || msg.includes("econnrefused") || msg.includes("network")));

  if (isNetworkError) {
    return "Please check your internet connection and try again.";
  }

  // 3. Server Errors (HTTP 500, 502, 503, 504, 5xx)
  if (typeof status === "number" && status >= 500 && status < 600) {
    return "Service is temporarily unavailable. Please try again in a few moments.";
  }

  // 4. HTTP 404 - Account / User not found
  const isUserNotFound =
    status === 404 ||
    msg.includes("no account found") ||
    msg.includes("user not found") ||
    msg.includes("customer not found") ||
    msg.includes("technician not found") ||
    msg.includes("account not found") ||
    msg.includes("email not registered") ||
    msg.includes("not registered");

  if (isUserNotFound) {
    return "No account found with this email address. Please check your email or register.";
  }

  // 5. HTTP 401 / Authentication Error
  const isAuthError =
    status === 401 ||
    msg.includes("invalid email or password") ||
    msg.includes("invalid password") ||
    msg.includes("unauthorized") ||
    msg.includes("invalid credentials") ||
    msg.includes("authentication failed");

  if (isAuthError) {
    return "Invalid email or password. Please check your credentials and try again.";
  }

  // Fallback for 400-499 client errors (except 404 handled above)
  if (typeof status === "number" && status >= 400 && status < 500) {
    return "Invalid email or password. Please check your credentials and try again.";
  }

  // Fallback for any other unknown errors
  return "Something went wrong. Please try again.";
}

export * from "./location";

export default { toTitleCase, cleanPhoneNumber, sleep, getWarrantyStatus, getFriendlyAuthErrorMessage };
