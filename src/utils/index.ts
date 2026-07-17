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

export default { toTitleCase, cleanPhoneNumber, sleep, getWarrantyStatus };
