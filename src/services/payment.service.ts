import { apiClient } from "../api/client";

export interface PlatformCharges {
  shippingCharge: string;
  handlingCharge: string;
  taxPercentage: string;
  platformFee: string;
  dailyDiscount: string;
  weeklyDiscount: string;
  monthlyDiscount: string;
  shippingEnabled: boolean;
  handlingEnabled: boolean;
  dailyDiscountEnabled: boolean;
  weeklyDiscountEnabled: boolean;
  monthlyDiscountEnabled: boolean;
}

export interface MobilePaymentConfig {
  gstEnabled: boolean;
  gstNumber: string | null;
  gstPercent: number;
  upiEnabled: boolean;
  upiId: string | null;
  upiAccountName: string | null;
  upiQrImageUrl: string | null;
  currency: string;
}

export class PaymentService {
  /**
   * GET /web/settings/charges
   * Fetches platform charge settings.
   */
  static async getPlatformCharges(): Promise<PlatformCharges> {
    const res = await apiClient.get<any>("/web/settings/charges");
    // The response structure is { success: true, data: { ... } }
    return res.data?.data;
  }

  /**
   * GET /mobile/payment-config
   * Fetches tenant-specific mobile payment config (GST, UPI settings).
   */
  static async getMobilePaymentConfig(): Promise<MobilePaymentConfig> {
    const res = await apiClient.get<any>("/mobile/payment-config");
    // The response structure is { data: { ... } } or { success: true, data: { ... } }
    // Checking mobile-payment.service.ts: returns { data: { ... } }
    return res.data?.data || res.data;
  }
}
