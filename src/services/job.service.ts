import { apiClient } from "../api/client";
import * as ImageManipulator from "expo-image-manipulator";
import { useAuthStore } from "../store/auth.store";
import { APP_CONFIG } from "../config/app.config";

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
  gstEnabled?: boolean;
  gstPercent?: number;
  closedAt?: string;
  createdAt?: string;
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
  checkOutTime?: string;
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
    gstEnabled: raw.gstEnabled ?? false,
    gstPercent: raw.gstPercent != null ? Number(raw.gstPercent) : 0,
    closedAt: raw.closedAt ? String(raw.closedAt) : undefined,
    images: images.map((img: any) => img.imageUrl),
    statusLogs: raw.statusLogs ?? [],
    createdAt: raw.createdAt ?? raw.created_at ?? undefined,
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

  return {
    checkedIn,
    checkInTime,
    // Dashboard does not return location — attendance history uses checkInRemarks
    checkInLocation: raw.checkInLocation ?? raw.checkInRemarks ?? raw.location ?? undefined,
    checkOutTime,
    workingHours: raw.workingHours ?? undefined,
    completedTickets: raw.completedTickets ?? undefined,
  };
}

function normalizeAttendanceRecord(raw: any): AttendanceRecord {
  // Attendance API fields: checkInTime (ISO), checkOutTime (ISO|null), checkInRemarks, date (ISO)

  const checkInTime: string | undefined = raw.checkInTime
    ? new Date(raw.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })
    : undefined;

  const checkOutTime: string | undefined = raw.checkOutTime
    ? new Date(raw.checkOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })
    : undefined;

  // Calculate working hours from timestamps
  let workingHours: string | undefined = raw.workingHours ?? undefined;
  if (!workingHours && raw.checkInTime && raw.checkOutTime) {
    const diffMs = new Date(raw.checkOutTime).getTime() - new Date(raw.checkInTime).getTime();
    const totalMins = Math.floor(diffMs / 60000);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    workingHours = `${h}h ${String(m).padStart(2, "0")}m`;
  }

  // Derive status from check-in time (after 09:30 IST = LATE, no checkIn = ABSENT)
  let status: "PRESENT" | "ABSENT" | "HALF_DAY" | "LATE" = "PRESENT";
  if (!raw.checkInTime) {
    status = "ABSENT";
  } else {
    // Formatter to extract local hour/minute in IST
    const formatter = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: false,
      timeZone: "Asia/Kolkata",
    });
    const formattedParts = formatter.formatToParts(new Date(raw.checkInTime));
    const hourPart = formattedParts.find((p) => p.type === "hour")?.value;
    const minPart = formattedParts.find((p) => p.type === "minute")?.value;
    const hour = hourPart ? parseInt(hourPart, 10) : 0;
    const min = minPart ? parseInt(minPart, 10) : 0;

    if (hour > 9 || (hour === 9 && min > 30)) status = "LATE";
  }

  // extract date part in local timezone
  // extract date part in local timezone from actual check-in time or createdAt to avoid UTC date-only offsets
  let dateStr = "";
  const baseDate = raw.checkInTime || raw.createdAt || raw.date;
  if (baseDate) {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "Asia/Kolkata",
    });
    dateStr = formatter.format(new Date(baseDate));
  }

  return {
    id: raw.id ?? "",
    date: dateStr,
    checkInTime,
    checkOutTime,
    workingHours,
    location: raw.checkInRemarks ?? raw.location ?? raw.checkInLocation ?? undefined,
    status,
  };
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
   * POST /mobile/technician/tickets/:ticketNo/reject
   * Body: { reason }
   */
  static async rejectJob(ticketNo: string, reason: string): Promise<{ ticketNo: string }> {
    const res = await apiClient.post<{ ticketNo: string }>(`${BASE}/tickets/${ticketNo}/reject`, {
      reason,
    });
    return res.data;
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
    let uploadUri = imageUri;
    let filename = `ticket_${Date.now()}.jpg`;
    let mimeType = "image/jpeg";

    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 1280 } }],
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
      );
      uploadUri = manipResult.uri;
    } catch (error) {
      console.error("Failed to compress technician image:", error);
    }

    const formData = new FormData();
    formData.append("file", {
      uri: uploadUri,
      name: filename,
      type: mimeType,
    } as any);

    const { token } = useAuthStore.getState();
    const headers: Record<string, string> = {
      "x-tenant-code": APP_CONFIG.tenantCode,
      "Accept": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${APP_CONFIG.apiBaseUrl}${BASE}/tickets/${ticketNo}/images?type=${type}`,
      {
        method: "POST",
        headers,
        body: formData,
      }
    );

    const resJson = await response.json();
    if (!response.ok) {
      throw new Error(resJson.message || "Failed to upload image");
    }
    return {
      url: resJson.data?.imageUrl || resJson.imageUrl || "",
    };
  }

  /**
   * Uploads all before photos and marks the job as IN_PROGRESS.
   * POST /mobile/technician/tickets/:ticketNo/images  (repeated per photo)
   * PATCH /mobile/technician/tickets/:ticketNo/status { status: "IN_PROGRESS" }
   */
  static async saveBeforePhotos(ticketNo: string, photos: string[]): Promise<Ticket> {
    // Upload each photo sequentially
    for (const uri of photos) {
      await JobService.uploadTicketImage(ticketNo, uri, "BEFORE");
    }
    // Transition status
    return JobService.updateJobStatus(ticketNo, "IN_PROGRESS");
  }

  /**
   * POST /mobile/technician/tickets/:ticketNo/complete
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
    }
  ): Promise<Ticket> {
    const backendPayload = {
      customerSignature: payload.customerSignature || "captured",
      notes: payload.workNotes || "Completed",
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

  static async collectPayment(
    ticketNo: string,
    payload: {
      amount: number;
      method: string;
    }
  ): Promise<{ invoiceNo: string; ticketNo: string; amount: number }> {
    const methodMapped = payload.method.toUpperCase() === "CASH" ? "CASH" : "UPI_QR";
    const backendPayload = {
      amount: payload.amount,
      method: methodMapped,
    };

    const res = await apiClient.post(`/mobile/technician/tickets/${ticketNo}/collect-payment`, backendPayload);
    return res.data;
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
    const response = await apiClient.get<{
      success: boolean;
      data: {
        isCheckedIn: boolean;
        checkInTime: string | null;
        checkOutTime: string | null;
        completedTickets?: number;
      };
    }>("/mobile/technician/dashboard");

    console.log("Technician dashboard attendance response:", response.data);
    console.log("DASHBOARD ATTENDANCE DATA:", response.data.data);

    const dashboard = response.data.data;
    const hasCheckedIn = !!dashboard.checkInTime;
    const hasCheckedOut = !!dashboard.checkOutTime;

    let workingHours: string | undefined = undefined;
    if (dashboard.checkInTime && dashboard.checkOutTime) {
      const diffMs = new Date(dashboard.checkOutTime).getTime() - new Date(dashboard.checkInTime).getTime();
      const totalMins = Math.floor(diffMs / 60000);
      const h = Math.floor(totalMins / 60);
      const m = totalMins % 60;
      workingHours = `${h}h ${String(m).padStart(2, "0")}m`;
    }

    return {
      checkedIn: dashboard.isCheckedIn === true && !hasCheckedOut,
      checkInTime: dashboard.checkInTime
        ? new Date(dashboard.checkInTime).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Kolkata",
        })
        : undefined,
      checkOutTime: dashboard.checkOutTime
        ? new Date(dashboard.checkOutTime).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Kolkata",
        })
        : undefined,
      checkInLocation: "Main Office HQ, Sector 62",
      shiftCompleted: hasCheckedIn && hasCheckedOut,
      rawCheckInTime: dashboard.checkInTime ?? undefined,
      workingHours,
      completedTickets: dashboard.completedTickets ?? undefined,
    };
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
    const res = await apiClient.post<AttendanceLog>(`${BASE}/attendance/checkin`, {
      lat: latitude ?? 28.6139,
      lng: longitude ?? 77.2090,
      remarks: location,
    });
    return res.data;
  }

  /**
   * POST /mobile/technician/attendance/checkout
   */
  static async checkOut(latitude?: number, longitude?: number): Promise<AttendanceLog> {
    console.log("CHECK OUT API CALLED ONLY BY BUTTON");
    const res = await apiClient.post<AttendanceLog>(`${BASE}/attendance/checkout`, {
      lat: latitude ?? 28.6139,
      lng: longitude ?? 77.2090,
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
