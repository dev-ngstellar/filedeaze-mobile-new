import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";

/**
 * Sanitizes a company or display name for use as a valid, cross-platform mobile filename.
 * Removes characters not allowed in file paths (\ / : * ? " < > |).
 */
export function sanitizeCompanyName(name?: string | null): string {
  if (!name || typeof name !== "string") return "";
  return name
    .replace(/[\x00-\x1f\x80-\x9f\\/:*?"<>|]/g, "") // Strip control and illegal filename chars
    .replace(/\s+/g, " ")                           // Normalize multiple consecutive spaces
    .replace(/\.+$/, "")                            // Avoid trailing dots before extension
    .trim();
}

/**
 * Builds the expected PDF filename:
 * - Service Bill: <existingCompanyName>.service-bill.pdf (Fallback: Service-Bill.pdf)
 * - Payment Receipt: <existingCompanyName>.payment-receipt.pdf (Fallback: Payment-Receipt.pdf)
 */
export function getPdfFilename(
  companyName: string | null | undefined,
  type: "service-bill" | "payment-receipt"
): string {
  const clean = sanitizeCompanyName(companyName);
  if (!clean) {
    return type === "service-bill" ? "Service-Bill.pdf" : "Payment-Receipt.pdf";
  }
  return `${clean}.${type}.pdf`;
}

/**
 * Prepares a generated PDF URI for sharing by copying it to a file with the target human-readable filename.
 * This ensures native share targets (WhatsApp, Mail, Drive, Files) display the proper filename instead of a UUID.
 */
export async function preparePdfForSharing(
  tempUri: string,
  filename: string
): Promise<string> {
  if (Platform.OS === "web") {
    return tempUri;
  }

  try {
    const dir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
    if (!dir) return tempUri;

    const targetUri = `${dir}${filename}`;

    try {
      const info = await FileSystem.getInfoAsync(targetUri);
      if (info.exists) {
        await FileSystem.deleteAsync(targetUri, { idempotent: true });
      }
    } catch {}

    await FileSystem.copyAsync({
      from: tempUri,
      to: targetUri,
    });

    return targetUri;
  } catch (err) {
    console.warn("[preparePdfForSharing] Could not rename PDF file, using default URI:", err);
    return tempUri;
  }
}
