import { Platform } from "react-native";
import { apiClient } from "../api/client";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { useAuthStore } from "../store/auth.store";
import { APP_CONFIG } from "../config/app.config";
import { prepareImageForUpload, prepareMediaForUpload, uploadMultipartRequest } from "../utils/mediaUpload";

// ==========================================
// DOMAIN TYPES (re-exported for consumers)
// ==========================================

export type TicketStatus =
  | "NEW_TICKET"
  | "ASSIGNED"
  | "ACCEPTED"
  | "TRAVELLING"
  | "REACHED_LOCATION"
  | "IN_PROGRESS"
  | "PENDING"
  | "COMPLETED"
  | "INVOICE_GENERATED"
  | "TICKET_CLOSED"
  | "CANCELLED"
  | "RESCHEDULED";

export type TicketPriority = "URGENT" | "HIGH" | "MEDIUM" | "LOW";

/** Part-level warranty coverage — NOT the same thing as AMC (ticket-level). Every spare part a
 * technician uses must be tagged individually; WARRANTY is always billed ₹0, OUT_OF_WARRANTY is
 * billed quantity × unit price. Backend computes the amount — this is only ever a selection. */
export type SparePartCoverageType = "WARRANTY" | "OUT_OF_WARRANTY";

/** A spare part available for a ticket's service (sub-category scoped). */
export interface SparePartCatalogItem {
  id: string;
  partName: string;
  partNumber?: string | null;
  description?: string | null;
  unitPrice: number;
  unitOfMeasure: string;
}

/** One spare-part line the technician is submitting — sparePartId/quantity/warrantyStatus is all
 * the backend needs; catalog fields are kept only for display, never sent back for calculation. */
export interface SparePartUsageInput {
  sparePartId: string;
  partName: string;
  unitPrice: number;
  quantity: number;
  warrantyStatus: SparePartCoverageType;
}

/** Editing-time shape for a spare-part row — warrantyStatus starts unset so the UI can force an
 * explicit choice before submission (see SparePartsSection's validation). localId is a client-only
 * key for list rendering/removal, distinct from sparePartId so re-adding the same catalog part
 * after removing it still gets a fresh row identity. */
export interface SparePartUsageDraft {
  localId: string;
  sparePartId: string;
  partName: string;
  unitPrice: number;
  quantity: number;
  warrantyStatus: SparePartCoverageType | null;
}

/** AMC contract summary for a ticket's asset — null when the asset has no active AMC contract. */
export interface TicketAmcStatus {
  subscriptionId: string;
  planName: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  totalVisits: number;
  remainingVisits: number;
}

/** GST-inclusive charge breakdown returned by preview-payment / collect-payment — the source of
 * truth for what to actually bill, never recomputed on device. */
export interface PaymentBreakdown {
  billingType: string;
  serviceCharge: number;
  labourCharge: number;
  sparePartsAmount: number;
  sparePartsWaived: boolean;
  serviceChargeWaived: boolean;
  labourChargeWaived: boolean;
  warrantyPartsValue: number;
  additionalCharge: number;
  discount: number;
  grossAmount: number;
  amount: number;
  amcCovered: boolean;
  fullyWaived: boolean;
  subtotal: number;
  gstEnabled: boolean;
  gstPercent: number;
  gstAmount: number;
  grandTotal: number;
}

/** Response of collect-payment — the breakdown plus the invoice/payment records it just created. */
export interface CollectPaymentResult extends PaymentBreakdown {
  paymentId: string;
  invoiceId: string;
  invoiceNumber: string;
}

export interface Ticket {
  id: string; // CHANGED: Add UUID field for API calls
  ticketNo: string;
  customerName: string;
  customerMobile: string;
  customerEmail?: string;
  customerAlternatePhone?: string;
  service: string;
  description: string;
  status: TicketStatus;
  priority?: TicketPriority;
  scheduledDate: string;
  scheduledTime: string;
  address: string;
  technicianName?: string;
  technicianMobile?: string;
  notes?: string;
  beforePhotos?: string[];
  afterPhotos?: string[];
  customerSignature?: string;
  workNotes?: string;
  duration?: string;
  paymentCollection?: number;
  paymentMethod?: string;
  nextVisitDate?: string;
  pendingReason?: string;
  category?: string;
  subCategory?: string;
  /** Used to scope the spare-parts catalog for this ticket's service. */
  subCategoryId?: string;
  categoryPrice?: number;
  serviceCharge?: number;
  inspectionCharge?: number;
  images?: string[];
  statusLogs?: { status: string; changedAt: string }[];
  scheduledDateRaw?: string;
  scheduledAt?: string;
  invoiceNo?: string;
  // Real invoice DB fields
  invoiceSubtotal?: number;
  invoiceGstAmount?: number;
  invoiceGstPercent?: number;
  invoiceTotal?: number;
  invoiceGeneratedAt?: string;
  /** Itemized invoice breakdown — persisted, exactly as billed. Used instead of any client-side
   * back-calculation (e.g. deriving spare parts from subtotal minus a guessed base price). */
  invoiceServiceCharge?: number;
  invoiceLabourCharge?: number;
  invoiceSparePartsAmount?: number;
  invoiceAdditionalCharge?: number;
  invoiceDiscount?: number;
  /** Whether service/labour were actually waived on the payment that was collected — the Invoice
   * row itself doesn't store this, only the Payment row does. */
  paymentServiceChargeWaived?: boolean;
  paymentLabourChargeWaived?: boolean;
  paymentWarrantyPartsValue?: number;
  paymentStatus?: string;
  gstEnabled?: boolean;
  gstPercent?: number;
  closedAt?: string;
  createdAt?: string;
  customerAsset?: {
    id?: string;
    name: string;
    brand?: string;
    model?: string;
    serialNumber?: string;
    purchaseDate?: string;
    warrantyExpiresAt?: string;
  };
  /** True when this ticket is billed under AMC (either a scheduled AMC visit or a customer-raised
   * AMC Service request) — service & labour charges are waived. */
  isAmcCovered?: boolean;
  /** Current AMC coverage summary for the ticket's asset. Only present on ticket detail responses. */
  amcStatus?: TicketAmcStatus | null;
  /** Itemised spare parts used on this ticket — populated from the API response on detail views.
   * Matches the TicketSparePart shape the backend returns. */
  spareParts?: {
    id: string;
    sparePartId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    coverageType: "WARRANTY" | "OUT_OF_WARRANTY";
  }[];
}

export interface Invoice {
  invoiceNo: string;
  ticketNo: string;
  amount: number;
  gst: number;
  total: number;
  paymentStatus: "PAID" | "UNPAID";
}

export interface AttendanceLog {
  checkedIn: boolean;
  checkInTime?: string;
  checkInLocation?: string;
  checkInRemarks?: string;
  checkOutTime?: string;
  checkOutLocation?: string;
  checkOutRemarks?: string;
  workingHours?: string;
  shiftCompleted?: boolean;
  rawCheckInTime?: string;
  completedTickets?: number;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  workingHours?: string;
  location?: string;
  status: "PRESENT" | "ABSENT" | "HALF_DAY" | "LATE";
}

export function normalizeTicket(raw: any): Ticket {
  if (!raw) return {} as Ticket;

  let scheduledDate = "—";
  let scheduledTime = "—";
  let scheduledDateRaw: string | undefined = undefined;
  if (raw.scheduledAt) {
    const d = new Date(raw.scheduledAt);
    scheduledDate = d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });
    scheduledTime = d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });
    try {
      scheduledDateRaw = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(d);
    } catch {
      scheduledDateRaw = raw.scheduledAt.substring(0, 10);
    }
  }

  // Handle images if they exist in raw
  const images = Array.isArray(raw.images) ? raw.images : [];
  const beforePhotos = Array.from(new Set(images.filter((img: any) => img.type === "BEFORE").map((img: any) => img.imageUrl as string))) as string[];
  const afterPhotos = Array.from(new Set(images.filter((img: any) => img.type === "AFTER").map((img: any) => img.imageUrl as string))) as string[];
  const customerSignature = images.find((img: any) => img.type === "SIGNATURE")?.imageUrl as string | undefined;

  return {
    id: raw.id ?? "",
    ticketNo: raw.ticketNumber ?? raw.ticketNo ?? "",
    customerName: raw.customer?.name ?? raw.customerName ?? "—",
    customerMobile: raw.customer?.phone ?? raw.customerMobile ?? "",
    customerEmail: raw.customer?.email ?? undefined,
    customerAlternatePhone: raw.customer?.alternatePhone ?? undefined,
    service: raw.subCategory?.name ?? raw.service ?? "—",
    category: raw.subCategory?.category?.name ?? raw.category ?? "",
    subCategoryId: raw.subCategory?.id ?? raw.subCategoryId ?? undefined,
    description: raw.description ?? "",
    status: raw.status ?? "ASSIGNED",
    priority: raw.priority ?? undefined,
    scheduledDate,
    scheduledTime,
    address: raw.serviceAddress ?? raw.address ?? "",
    beforePhotos: beforePhotos.length > 0 ? beforePhotos : undefined,
    afterPhotos: afterPhotos.length > 0 ? afterPhotos : undefined,
    customerSignature: customerSignature ?? undefined,
    pendingReason: raw.pendingReason ?? undefined,
    workNotes: raw.workNotes ?? undefined,
    duration: raw.duration ?? undefined,
    paymentCollection: raw.payment?.amount ?? raw.paymentCollection ?? undefined,
    paymentMethod: raw.payment?.method ?? raw.paymentMethod ?? undefined,
    categoryPrice: raw.subCategory?.category?.price ? parseFloat(raw.subCategory?.category?.price) : undefined,
    serviceCharge: raw.subCategory?.serviceCharges?.serviceCharge ? Number(raw.subCategory?.serviceCharges?.serviceCharge) : undefined,
    inspectionCharge: raw.subCategory?.serviceCharges?.inspectionCharge ? Number(raw.subCategory?.serviceCharges?.inspectionCharge) : undefined,
    scheduledDateRaw,
    scheduledAt: raw.scheduledAt ?? undefined,
    invoiceNo: raw.invoice?.invoiceNumber ?? raw.invoice?.invoiceNo ?? raw.invoiceNo ?? undefined,
    // Real invoice DB fields — populated when invoice is included in the API response
    invoiceSubtotal: raw.invoice?.subtotal != null ? Number(raw.invoice.subtotal) : undefined,
    invoiceGstAmount: raw.invoice?.gstAmount != null ? Number(raw.invoice.gstAmount) : undefined,
    invoiceGstPercent: raw.invoice?.gstPercent != null ? Number(raw.invoice.gstPercent) : undefined,
    invoiceTotal: raw.invoice?.total != null ? Number(raw.invoice.total) : undefined,
    invoiceGeneratedAt: raw.invoice?.generatedAt ? String(raw.invoice.generatedAt) : undefined,
    invoiceServiceCharge: raw.invoice?.serviceCharge != null ? Number(raw.invoice.serviceCharge) : undefined,
    invoiceLabourCharge: raw.invoice?.labourCharge != null ? Number(raw.invoice.labourCharge) : undefined,
    invoiceSparePartsAmount: raw.invoice?.sparePartsAmount != null ? Number(raw.invoice.sparePartsAmount) : undefined,
    invoiceAdditionalCharge: raw.invoice?.additionalCharge != null ? Number(raw.invoice.additionalCharge) : undefined,
    invoiceDiscount: raw.invoice?.discount != null ? Number(raw.invoice.discount) : undefined,
    paymentServiceChargeWaived: raw.payment?.serviceChargeWaived ?? undefined,
    paymentLabourChargeWaived: raw.payment?.labourChargeWaived ?? undefined,
    paymentWarrantyPartsValue: raw.payment?.warrantyPartsValue != null ? Number(raw.payment.warrantyPartsValue) : (raw.invoice?.warrantySavings != null ? Number(raw.invoice.warrantySavings) : undefined),
    paymentStatus: raw.payment?.status ?? undefined,
    gstEnabled: raw.gstEnabled ?? false,
    gstPercent: raw.gstPercent != null ? Number(raw.gstPercent) : 0,
    closedAt: raw.closedAt ? String(raw.closedAt) : undefined,
    images: images.map((img: any) => img.imageUrl),
    statusLogs: raw.statusLogs ?? [],
    createdAt: raw.createdAt ?? raw.created_at ?? undefined,
    customerAsset: (raw.customerAsset || raw.asset) ? {
      id: raw.customerAsset?.id ?? raw.asset?.id,
      name: raw.customerAsset?.name ?? raw.asset?.name ?? "—",
      brand: raw.customerAsset?.brand ?? raw.asset?.brand ?? undefined,
      model: raw.customerAsset?.model ?? raw.asset?.model ?? undefined,
      serialNumber: raw.customerAsset?.serialNumber ?? raw.asset?.serialNumber ?? undefined,
      purchaseDate: raw.customerAsset?.purchaseDate ?? raw.asset?.purchaseDate ?? undefined,
      warrantyExpiresAt: raw.customerAsset?.warrantyExpiresAt ?? raw.asset?.warrantyExpiresAt ?? undefined,
    } : undefined,
    isAmcCovered: Boolean(raw.isAmcCovered || raw.amcStatus || raw.amcPlan || raw.isAmc),
    amcStatus: raw.amcStatus ? {
      subscriptionId: raw.amcStatus.subscriptionId ?? raw.amcStatus.id ?? "",
      planName: raw.amcStatus.planName ?? raw.amcStatus.plan?.name ?? "AMC Plan",
      status: raw.amcStatus.status ?? "ACTIVE",
      startDate: raw.amcStatus.startDate ?? null,
      endDate: raw.amcStatus.endDate ?? null,
      totalVisits: raw.amcStatus.totalVisits ?? 0,
      remainingVisits: raw.amcStatus.remainingVisits ?? raw.amcStatus.visitsRemaining ?? 0,
    } : (raw.amcPlan || raw.amcSubscription || raw.amc) ? {
      subscriptionId: raw.amcPlan?.subscriptionId ?? raw.amcSubscription?.id ?? raw.amc?.id ?? "",
      planName: raw.amcPlan?.name ?? raw.amcSubscription?.planName ?? raw.amc?.planName ?? "AMC Plan",
      status: raw.amcPlan?.status ?? raw.amcSubscription?.status ?? raw.amc?.status ?? "ACTIVE",
      startDate: raw.amcPlan?.startDate ?? raw.amcSubscription?.startDate ?? raw.amc?.startDate ?? null,
      endDate: raw.amcPlan?.endDate ?? raw.amcSubscription?.endDate ?? raw.amc?.endDate ?? null,
      totalVisits: raw.amcPlan?.totalVisits ?? raw.amcSubscription?.totalVisits ?? raw.amc?.totalVisits ?? 0,
      remainingVisits: raw.amcPlan?.remainingVisits ?? raw.amcSubscription?.remainingVisits ?? raw.amc?.remainingVisits ?? 0,
    } : undefined,
    spareParts: Array.isArray(raw.spareParts)
      ? raw.spareParts.map((p: any) => ({
          id: p.id ?? "",
          sparePartId: p.sparePartId ?? "",
          name: p.name ?? p.partName ?? "—",
          quantity: Number(p.quantity ?? 1),
          unitPrice: Number(p.unitPrice ?? 0),
          coverageType: (p.coverageType ?? "OUT_OF_WARRANTY") as "WARRANTY" | "OUT_OF_WARRANTY",
        }))
      : undefined,
  };
}

function normalizeAttendanceLog(raw: any): AttendanceLog {
  if (!raw) return { checkedIn: false };

  // Dashboard API field is "isCheckedIn" (boolean)
  const checkedIn: boolean = Boolean(raw.isCheckedIn ?? raw.checkedIn ?? false);

  // checkInTime is ISO string — convert to readable time "06:32 AM"
  const checkInTime: string | undefined = raw.checkInTime
    ? new Date(raw.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : undefined;

  const checkOutTime: string | undefined = raw.checkOutTime
    ? new Date(raw.checkOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : undefined;

  const checkInLocation =
    raw.checkInLocation ??
    raw.location ??
    raw.locationName ??
    raw.address ??
    raw.checkInRemarks ??
    raw.remarks ??
    "Location unavailable";

  return {
    checkedIn,
    checkInTime,
    checkInLocation,
    checkOutTime,
    workingHours: raw.workingHours ?? undefined,
    completedTickets: raw.completedTickets ?? undefined,
  };
}

function normalizeAttendanceRecord(raw: any): any {
  console.log("=== TRACE STEP 2: normalizeAttendanceRecord START ===");
  console.log("Raw input object:", JSON.stringify(raw, null, 2));
  console.log("Extracted raw values:", {
    checkInLocation: raw?.checkInLocation ?? raw?.data?.checkInLocation,
    location: raw?.location ?? raw?.data?.location,
    checkInRemarks: raw?.checkInRemarks ?? raw?.data?.checkInRemarks,
    remarks: raw?.remarks ?? raw?.data?.remarks,
  });

  if (!raw) {
    const emptyLog = {
      id: "",
      date: "",
      checkedIn: false,
      checkInTime: undefined,
      checkOutTime: undefined,
      workingHours: undefined,
      checkInLocation: "Location unavailable",
      location: "Location unavailable",
      status: "ABSENT",
      shiftCompleted: false,
    };
    console.log("=== TRACE STEP 2: normalizeAttendanceRecord END (empty) ===", emptyLog);
    return emptyLog;
  }

  const rawData = raw?.data || raw;
  const attCandidate = (rawData.attendance && typeof rawData.attendance === "object" && !Array.isArray(rawData.attendance))
    ? rawData.attendance
    : (rawData.todayAttendance && typeof rawData.todayAttendance === "object" && !Array.isArray(rawData.todayAttendance))
      ? rawData.todayAttendance
      : (rawData.checkIn && typeof rawData.checkIn === "object" && !Array.isArray(rawData.checkIn))
        ? rawData.checkIn
        : rawData;
  const att = attCandidate || rawData;

  // Check explicit boolean flags or presence of checkInTime without checkOutTime
  const isExplicitlyCheckedIn = Boolean(
    rawData.isCheckedIn === true ||
    att.isCheckedIn === true ||
    rawData.checkedIn === true ||
    att.checkedIn === true ||
    (Boolean(att.checkInTime || rawData.checkInTime) && !Boolean(att.checkOutTime || rawData.checkOutTime))
  );

  const rawCheckInTimeStr = att.checkInTime || rawData.checkInTime || att.check_in_time || rawData.check_in_time;
  const rawCheckOutTimeStr = att.checkOutTime || rawData.checkOutTime || att.check_out_time || rawData.check_out_time;

  const hasCheckedOut = Boolean(rawCheckOutTimeStr);

  const checkInTime: string | undefined = (isExplicitlyCheckedIn && rawCheckInTimeStr)
    ? new Date(rawCheckInTimeStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })
    : (rawCheckInTimeStr && hasCheckedOut)
      ? new Date(rawCheckInTimeStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })
      : undefined;

  const checkOutTime: string | undefined = rawCheckOutTimeStr
    ? new Date(rawCheckOutTimeStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })
    : undefined;

  let workingHours: string | undefined = att.workingHours ?? rawData.workingHours ?? undefined;
  if (!workingHours && rawCheckInTimeStr && rawCheckOutTimeStr) {
    const diffMs = new Date(rawCheckOutTimeStr).getTime() - new Date(rawCheckInTimeStr).getTime();
    const totalMins = Math.floor(diffMs / 60000);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    workingHours = `${h}h ${String(m).padStart(2, "0")}m`;
  }

  let status: "PRESENT" | "ABSENT" | "HALF_DAY" | "LATE" = "ABSENT";
  if (isExplicitlyCheckedIn || hasCheckedOut) {
    status = "PRESENT";
    if (att.checkInTime) {
      const formatter = new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "numeric",
        hour12: false,
        timeZone: "Asia/Kolkata",
      });
      const formattedParts = formatter.formatToParts(new Date(att.checkInTime));
      const hourPart = formattedParts.find((p) => p.type === "hour")?.value;
      const minPart = formattedParts.find((p) => p.type === "minute")?.value;
      const hour = hourPart ? parseInt(hourPart, 10) : 0;
      const min = minPart ? parseInt(minPart, 10) : 0;

      if (hour > 9 || (hour === 9 && min > 30)) status = "LATE";
    }
  }

  let dateStr = "";
  const baseDate = att.checkInTime || att.createdAt || att.date || rawData.date;
  if (baseDate) {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "Asia/Kolkata",
    });
    dateStr = formatter.format(new Date(baseDate));
  }

  // Helper to extract location string from remarks, location object {lat, lng}, or string
  const formatLocationString = (remarks?: string, locObj?: any, legacyLoc?: string): string | undefined => {
    if (remarks && typeof remarks === "string" && remarks.trim()) {
      return remarks.trim();
    }
    if (locObj && typeof locObj === "object") {
      if (locObj.remarks && typeof locObj.remarks === "string" && locObj.remarks.trim()) {
        return locObj.remarks.trim();
      }
      if (locObj.lat !== undefined && locObj.lng !== undefined) {
        return `${Number(locObj.lat).toFixed(4)}, ${Number(locObj.lng).toFixed(4)}`;
      }
      if (locObj.latitude !== undefined && locObj.longitude !== undefined) {
        return `${Number(locObj.latitude).toFixed(4)}, ${Number(locObj.longitude).toFixed(4)}`;
      }
    }
    if (typeof locObj === "string" && locObj.trim()) {
      return locObj.trim();
    }
    if (legacyLoc && typeof legacyLoc === "string" && legacyLoc.trim()) {
      return legacyLoc.trim();
    }
    return undefined;
  };

  const rawCheckInRemarks = att.checkInRemarks ?? att.remarks ?? rawData.checkInRemarks ?? rawData.remarks;
  const rawCheckInLocObj = att.checkInLocation ?? att.location ?? rawData.checkInLocation ?? rawData.location;
  const rawCheckInLegacy = att.locationName ?? att.address ?? rawData.locationName ?? rawData.address;

  const rawCheckOutRemarks = att.checkOutRemarks ?? rawData.checkOutRemarks;
  const rawCheckOutLocObj = att.checkOutLocation ?? rawData.checkOutLocation;

  const checkInLocationStr = formatLocationString(rawCheckInRemarks, rawCheckInLocObj, rawCheckInLegacy) || "Location unavailable";
  const checkOutLocationStr = formatLocationString(rawCheckOutRemarks, rawCheckOutLocObj);

  const normalized = {
    id: att.id ?? rawData.id ?? "",
    date: dateStr,
    checkedIn: isExplicitlyCheckedIn && !hasCheckedOut,
    checkInTime: isExplicitlyCheckedIn || hasCheckedOut ? checkInTime : undefined,
    checkInLocation: checkInLocationStr !== "Location unavailable" ? checkInLocationStr : undefined,
    checkInRemarks: rawCheckInRemarks ?? undefined,
    checkOutTime,
    checkOutLocation: checkOutLocationStr,
    checkOutRemarks: rawCheckOutRemarks ?? undefined,
    workingHours,
    location: checkInLocationStr !== "Location unavailable" ? checkInLocationStr : undefined,
    status,
    shiftCompleted: (isExplicitlyCheckedIn || hasCheckedOut) && hasCheckedOut,
    rawCheckInTime: isExplicitlyCheckedIn || hasCheckedOut ? (rawCheckInTimeStr ?? undefined) : undefined,
    completedTickets: att.completedTickets ?? rawData.completedTickets ?? undefined,
  };

  console.log("=== TRACE STEP 2: normalizeAttendanceRecord OUTPUT ===");
  console.log("Normalized Object:", JSON.stringify(normalized, null, 2));

  return normalized;
}

const BASE = "/mobile/technician";

export class JobService {
  // ==========================================
  // TECHNICIAN — TICKETS
  // ==========================================

  /**
   * GET /mobile/technician/tickets
   * Returns all tickets assigned to the logged-in technician.
   */
  static async getTechnicianJobs(month?: number, year?: number): Promise<Ticket[]> {
    const params: Record<string, number> = {};
    if (month !== undefined) params.month = month;
    if (year !== undefined) params.year = year;
    const res = await apiClient.get<any>(`${BASE}/tickets`, { params });
    console.log("getTechnicianJobs response:", JSON.stringify(res.data, null, 2));
    const rawList = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    return rawList.map(normalizeTicket);
  }

  /**
   * GET /mobile/technician/tickets/:ticketNo
   */
  static async getJobDetails(ticketNo: string): Promise<Ticket | null> {
    try {
      console.log("getJobDetails calling ticketNo:", ticketNo);
      const res = await apiClient.get<any>(`${BASE}/tickets/${ticketNo}`);
      console.log("getJobDetails response data:", JSON.stringify(res.data, null, 2));
      const rawData = res.data && res.data.data ? res.data.data : res.data;
      if (!rawData) return null;
      return normalizeTicket(rawData);
    } catch (e: any) {
      console.error("getJobDetails error:", e.message || e);
      return null;
    }
  }

  /**
   * PATCH /mobile/technician/tickets/:ticketNo/status
   * Body: { status }
   */
  static async updateJobStatus(ticketNo: string, status: TicketStatus): Promise<Ticket> {
    let apiStatus: string = status;
    const s = status as string;
    if (s === "REACHED") apiStatus = "REACHED_LOCATION";
    else if (s === "NEW") apiStatus = "NEW_TICKET";
    else if (s === "CLOSED") apiStatus = "TICKET_CLOSED";

    const res = await apiClient.patch<Ticket>(`${BASE}/tickets/${ticketNo}/status`, { status: apiStatus });
    return res.data;
  }

  /**
   * PATCH /mobile/technician/tickets/:ticketId/asset
   * Body: { customerAssetId }
   */
  static async assignAssetToTicket(ticketId: string, assetId: string): Promise<Ticket> {
    const res = await apiClient.patch<any>(`${BASE}/tickets/${ticketId}/asset`, { customerAssetId: assetId });
    const rawData = res.data?.data || res.data;
    return normalizeTicket(rawData);
  }

  /**
   * Fetches customer's existing assets for assignment using /mobile/customer/assets.
   */
  static async getCustomerAssetsForTicket(ticketId: string): Promise<any[]> {
    try {
      const res = await apiClient.get<any>(`/mobile/customer/assets`);
      const rawList = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      return rawList;
    } catch {
      return [];
    }
  }

  /**
   * POST /mobile/technician/tickets/:ticketNo/reject
   * Body: { reason }
   */
  static async rejectJob(ticketNo: string, reason: string): Promise<{ ticketNo: string }> {
    const res = await apiClient.post<{ ticketNo: string }>(`${BASE}/tickets/${ticketNo}/reject`, {
      reason,
    });
    return res.data;
  }

  static async compressImageFrontend(
    imageUri: string,
    maxWidth = 1024,
    quality = 0.5
  ): Promise<string> {
    if (!imageUri) return imageUri;

    // Web Browser Environment (blob:, data:, http:)
    if (
      typeof window !== "undefined" &&
      typeof document !== "undefined" &&
      (imageUri.startsWith("blob:") || imageUri.startsWith("data:") || imageUri.startsWith("http"))
    ) {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
              console.log(`[Web Compressor] Original ${img.width}x${img.height} -> Compressed ${width}x${height}`);
              resolve(compressedDataUrl);
              return;
            }
          } catch (err) {
            console.warn("[Web Compressor] Canvas compression error:", err);
          }
          resolve(imageUri);
        };
        img.onerror = (err) => {
          console.warn("[Web Compressor] Failed to load image element:", err);
          resolve(imageUri);
        };
        img.src = imageUri;
      });
    }

    // Native React Native Environment (file://, content://)
    try {
      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: maxWidth } }],
        { compress: quality, format: SaveFormat.JPEG }
      );
      if (result && result.uri) {
        console.log(`[Native Compressor] Compressed URI: ${result.uri}`);
        return result.uri;
      }
    } catch (err) {
      console.warn("[Native Compressor] ImageManipulator error:", err);
    }

    return imageUri;
  }

  /**
   * POST /mobile/technician/tickets/:ticketNo/images
   * Uploads a single image (multipart/form-data).
   * type: "BEFORE" | "AFTER"
   */
  static async uploadTicketImage(
    ticketNo: string,
    imageUri: string,
    type: "BEFORE" | "AFTER"
  ): Promise<{ url: string }> {
    console.log("=== TRACE: uploadTicketImage START ===", { ticketNo, type, imageUri });

    // Run through standard media preparation pipeline
    const prepared = await prepareImageForUpload(
      { uri: imageUri, type: "image" },
      "CAMERA"
    );

    // Construct FormData payload safely for both Web & Native
    const formData = new FormData();
    if (typeof window !== "undefined" && prepared.uri.startsWith("data:")) {
      const fetchRes = await fetch(prepared.uri);
      const blob = await fetchRes.blob();
      formData.append("file", blob, prepared.name);
    } else {
      const formattedUri = Platform.OS === "android" && !prepared.uri.startsWith("file://") && !prepared.uri.startsWith("content://")
        ? `file://${prepared.uri}`
        : prepared.uri;

      formData.append("file", {
        uri: formattedUri,
        name: prepared.name,
        type: prepared.type,
      } as any);
    }

    try {
      const resData = await uploadMultipartRequest(
        `${BASE}/tickets/${ticketNo}/images?type=${type}`,
        formData,
        { timeoutMs: 60000 }
      );

      console.log("Upload Ticket Image Success:", resData);
      return {
        url: resData?.imageUrl || resData?.url || "",
      };
    } catch (err: any) {
      console.error("=== ERROR in uploadTicketImage ===", err);
      throw new Error(err.message || "Failed to upload image.");
    }
  }

  /**
   * Uploads all before photos and marks the job as IN_PROGRESS.
   * POST /mobile/technician/tickets/:ticketNo/images  (repeated per photo)
   * PATCH /mobile/technician/tickets/:ticketNo/status { status: "IN_PROGRESS" }
   */
  static async saveBeforePhotos(ticketNo: string, photos: string[]): Promise<Ticket> {
    console.log("=== TRACE: saveBeforePhotos START ===");
    console.log("ticketNo:", ticketNo, "photos:", photos);

    for (const uri of photos) {
      if (uri) {
        await JobService.uploadTicketImage(ticketNo, uri, "BEFORE");
      }
    }

    console.log("=== TRACE: saveBeforePhotos -> updating status to IN_PROGRESS ===");
    return JobService.updateJobStatus(ticketNo, "IN_PROGRESS");
  }

  /**
   * POST /mobile/technician/tickets/:ticketNo/complete
   * sparePartsUsed carries only sparePartId/quantity/warrantyStatus per line — coverageType and
   * calculatedAmount are computed server-side, never on device.
   */
  static async completeJob(
    ticketNo: string,
    payload: {
      beforePhotos: string[];
      afterPhotos: string[];
      customerSignature: string;
      workNotes: string;
      duration: string;
      paymentCollection?: number;
      paymentMethod?: string;
      sparePartsUsed?: { sparePartId: string; quantity: number; warrantyStatus: SparePartCoverageType }[];
    }
  ): Promise<Ticket> {
    const backendPayload = {
      customerSignature: payload.customerSignature || "captured",
      notes: payload.workNotes || "Completed",
      ...(payload.sparePartsUsed?.length ? { sparePartsUsed: payload.sparePartsUsed } : {}),
    };
    const res = await apiClient.post<Ticket>(`${BASE}/tickets/${ticketNo}/complete`, backendPayload);
    return res.data;
  }

  /**
   * POST /mobile/technician/tickets/:ticketNo/pending
   */
  static async markJobPending(
    ticketNo: string,
    pendingReason: string,
    notes?: string,
    photos?: string[]
  ): Promise<Ticket> {
    let reasonEnum = "ADDITIONAL_VISIT_REQUIRED";
    const lowerReason = pendingReason.toLowerCase();
    if (lowerReason.includes("customer")) {
      reasonEnum = "CUSTOMER_NOT_AVAILABLE";
    } else if (lowerReason.includes("spare") || lowerReason.includes("parts")) {
      reasonEnum = "SPARE_PARTS_NEEDED";
    } else if (lowerReason.includes("additional") || lowerReason.includes("visit")) {
      reasonEnum = "ADDITIONAL_VISIT_REQUIRED";
    }

    const finalNotes = notes && notes.trim() !== "" ? notes.trim() : `Marked as pending: ${pendingReason}`;

    const res = await apiClient.post<Ticket>(`${BASE}/tickets/${ticketNo}/pending`, {
      reason: reasonEnum,
      notes: finalNotes,
      photos,
    });
    return res.data;
  }

  /**
   * GET /mobile/technician/tickets/:ticketNo/payment-preview
   * Backend-computed GST-inclusive breakdown before submitting collectPayment() — AMC waivers and
   * per-part warranty amounts are applied here, never on device.
   */
  static async previewPayment(
    ticketNo: string,
    params: { serviceCharge: number; labourCharge?: number; additionalCharge?: number; discount?: number }
  ): Promise<PaymentBreakdown> {
    const res = await apiClient.get<{ data: PaymentBreakdown }>(
      `${BASE}/tickets/${ticketNo}/payment-preview`,
      { params }
    );
    return (res.data as any)?.data ?? res.data;
  }

  /**
   * POST /mobile/technician/tickets/:ticketNo/collect-payment
   * serviceCharge is mandatory (billed ₹0 server-side when the ticket is AMC-covered).
   * warrantyParts/nonWarrantyParts only need {sparePartId, quantity} — which array a line is in
   * IS its warranty status; unitPrice/coverageType/calculatedAmount are resolved server-side.
   */
  static async collectPayment(
    ticketNo: string,
    payload: {
      serviceCharge: number;
      labourCharge?: number;
      additionalCharge?: number;
      discount?: number;
      warrantyParts?: { sparePartId: string; quantity: number }[];
      nonWarrantyParts?: { sparePartId: string; quantity: number }[];
      method: string;
    }
  ): Promise<CollectPaymentResult> {
    const methodMapped = payload.method.toUpperCase() === "CASH" ? "CASH" : "UPI_QR";
    const backendPayload = {
      serviceCharge: payload.serviceCharge,
      labourCharge: payload.labourCharge,
      additionalCharge: payload.additionalCharge,
      discount: payload.discount,
      warrantyParts: payload.warrantyParts?.length ? payload.warrantyParts : undefined,
      nonWarrantyParts: payload.nonWarrantyParts?.length ? payload.nonWarrantyParts : undefined,
      method: methodMapped,
    };

    const res = await apiClient.post<{ data: CollectPaymentResult }>(
      `/mobile/technician/tickets/${ticketNo}/collect-payment`,
      backendPayload
    );
    return (res.data as any)?.data ?? res.data;
  }

  /**
   * GET /mobile/technician/service-sub-categories/:subCategoryId/spare-parts
   * TODO(backend): this technician-scoped route does not exist yet — only the manager/admin
   * route (`web/manager/service-sub-categories/:subCategoryId/spare-parts`) is implemented, and
   * it's guarded to ADMIN/MANAGER roles only, so a technician JWT cannot call it. Add a
   * technician-accessible mirror (read-only, isActive parts only) so this can list real catalog
   * data. Until then this call will 403/404 — callers must treat the failure as "catalog
   * unavailable" (see SparePartPickerModal's error state), not crash.
   */
  static async getSparePartsForSubCategory(subCategoryId: string): Promise<SparePartCatalogItem[]> {
    const res = await apiClient.get<any>(`${BASE}/service-sub-categories/${subCategoryId}/spare-parts`);
    const body = res.data;
    const list = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : Array.isArray(body?.data?.items) ? body.data.items : Array.isArray(body?.items) ? body.items : [];
    return list.map((p: any) => ({
      id: p.id,
      partName: p.name,
      partNumber: p.partNumber ?? null,
      description: p.description ?? null,
      unitPrice: Number(p.price) || 0,
      unitOfMeasure: p.unit,
    }));
  }

  /**
   * PATCH /mobile/technician/tickets/:ticketNo/reschedule
   */
  static async rescheduleJob(ticketNo: string, nextVisitDate: string): Promise<Ticket> {
    const res = await apiClient.patch<Ticket>(`${BASE}/tickets/${ticketNo}/reschedule`, {
      nextVisitDate,
    });
    return res.data;
  }

  // ==========================================
  // ATTENDANCE
  // ==========================================

  /**
   * GET /mobile/technician/attendance/today
   */
  static async getAttendanceStatus(): Promise<AttendanceLog> {
    console.log("=== TRACE STEP 1: getAttendanceStatus START ===");
    const response = await apiClient.get<any>("/mobile/technician/dashboard");
    console.log("Dashboard API response object:", JSON.stringify(response.data, null, 2));

    const rawData = response.data?.data || response.data || {};
    const normalized = normalizeAttendanceRecord(rawData);
    console.log("=== TRACE STEP 1: getAttendanceStatus END ===");
    console.log("Returned Object:", JSON.stringify(normalized, null, 2));
    return normalized;
  }

  /**
   * GET /mobile/technician/attendance?month=&year=
   */
  static async getAttendanceHistory(
    month?: number,
    year?: number
  ): Promise<AttendanceRecord[]> {
    const params: Record<string, number> = {};
    if (month !== undefined) params.month = month;
    if (year !== undefined) params.year = year;
    const res = await apiClient.get<{ success: boolean; data: any[] }>(`${BASE}/attendance`, { params });
    const rawList = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    return rawList.map(normalizeAttendanceRecord);
  }

  /**
   * POST /mobile/technician/attendance/checkin
   */
  static async checkIn(
    location: string,
    latitude?: number,
    longitude?: number
  ): Promise<AttendanceLog> {
    console.log("CHECK IN API CALLED ONLY BY BUTTON");
    const res = await apiClient.post<any>(`${BASE}/attendance/checkin`, {
      lat: latitude,
      lng: longitude,
      remarks: location,
    });
    console.log("STEP 1 - CheckIn API", res.data);
    const normalized = normalizeAttendanceRecord(res.data?.data || res.data);
    return normalized;
  }

  /**
   * POST /mobile/technician/attendance/checkout
   */
  static async checkOut(latitude?: number, longitude?: number): Promise<AttendanceLog> {
    console.log("CHECK OUT API CALLED ONLY BY BUTTON");
    const res = await apiClient.post<AttendanceLog>(`${BASE}/attendance/checkout`, {
      lat: latitude,
      lng: longitude,
    });
    return res.data;
  }

  // ==========================================
  // CUSTOMER FLOWS
  // ==========================================

  /**
   * GET /mobile/customer/tickets?mobile=
   */
  static async getCustomerTickets(mobile: string): Promise<Ticket[]> {
    const res = await apiClient.get<any>("/mobile/customer/tickets", {
      params: { mobile },
    });
    return res.data?.data || [];
  }

  /**
   * POST /mobile/customer/tickets
   */
  static async raiseTicket(payload: {
    customerName: string;
    customerMobile: string;
    category: string;
    subCategory: string;
    description: string;
    address: string;
    images?: string[];
  }): Promise<Ticket> {
    const res = await apiClient.post<Ticket>("/mobile/customer/tickets", payload);
    return res.data;
  }

  /**
   * GET /mobile/customer/invoices?mobile=
   */
  static async getCustomerInvoices(mobile: string): Promise<Invoice[]> {
    const res = await apiClient.get<any>("/mobile/customer/invoices", {
      params: { mobile },
    });
    return res.data?.data || [];
  }

  /**
   * GET /mobile/technician/invoices
   */
  static async getTechnicianInvoices(month?: number, year?: number): Promise<any[]> {
    const params: any = {};
    if (month !== undefined) params.month = month;
    if (year !== undefined) params.year = year;
    const res = await apiClient.get<any>("/mobile/technician/invoices", { params });
    return res.data?.data || res.data || [];
  }
}

export default JobService;
