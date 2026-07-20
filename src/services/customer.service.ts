import { apiClient } from "../api/client";
import { useAuthStore } from "../store/auth.store";
import { APP_CONFIG } from "../config/app.config";

export interface Address {
  id: string;
  label: string;
  street: string;
  city: string;
  state?: string;
  country?: string;
  postalCode?: string;
  isActive: boolean;
}

export interface CustomerDashboardData {
  openTickets: number;
  completedTickets: number;
  recentInvoice: {
    id: string;
    invoiceNumber: string;
    total: number;
    generatedAt: string;
    pdfUrl: string | null;
    ticket: {
      ticketNumber: string;
      subCategory: {
        name: string;
        category: {
          name: string;
        };
      };
    };
  } | null;
}

export interface CustomerProfileData {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  alternatePhone: string | null;
  address: string | null;
  city: string | null;
  pincode: string | null;
  profileImageUrl?: string | null;
  _count?: {
    tickets: number;
    feedback: number;
  };
}

export interface TicketLog {
  id: string;
  status: string;
  changedAt: string;
  changedBy: string;
  notes: string | null;
}

/** AMC contract summary attached to a ticket's asset — null when the asset has no active AMC contract. */
export interface TicketAmcStatus {
  subscriptionId: string;
  planName: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  totalVisits: number;
  remainingVisits: number;
}

export interface CustomerTicketDetail {
  id: string;
  ticketNumber: string;
  description: string;
  serviceAddress: string | null;
  priority: string;
  status: string;
  scheduledAt: string | null;
  createdAt: string;
  /** Non-null only when this ticket was raised as an AMC Service request (isAmcRequest: true). */
  amcSubscriptionId?: string | null;
  /** Current AMC coverage summary for the ticket's asset — independent of whether this particular
   * ticket was raised as an AMC request (see amcSubscriptionId for that). */
  amcStatus?: TicketAmcStatus | null;
  technician: {
    id: string;
    name: string;
    phone: string;
    currentLat: number | null;
    currentLng: number | null;
    rating: number | null;
  } | null;
  customerAsset?: {
    id: string;
    name: string;
    brand: string | null;
    model: string | null;
    serialNumber: string | null;
  } | null;
  subCategory: {
    id: string;
    name: string;
    category: {
      id: string;
      name: string;
    };
    serviceCharges?: {
      id: string;
      amount: number;
    }[];
  };
  images: {
    id: string;
    imageUrl: string;
    type: string;
  }[];
  statusLogs: TicketLog[];
  payment?: {
    id: string;
    status: string;
    amount: number;
    method: string;
    serviceCharge: number;
    labourCharge: number;
    sparePartsAmount: number;
    serviceChargeWaived: boolean;
    labourChargeWaived: boolean;
    sparePartsWaived: boolean;
    warrantyPartsValue?: number | null;
    additionalCharge: number;
    discount: number;
  } | null;
  invoice?: {
    id: string;
    invoiceNumber: string;
    serviceCharge: number;
    labourCharge: number;
    sparePartsAmount: number;
    warrantyPartsValue?: number | null;
    additionalCharge: number;
    discount: number;
    subtotal: number;
    gstPercent: number;
    gstAmount: number;
    total: number;
    pdfUrl: string | null;
    generatedAt: string;
  } | null;
  feedback?: {
    id: string;
    rating: number;
    review: string;
  } | null;
  cancelReason?: string | null;
}

export interface CustomerPayment {
  id: string;
  createdAt: string;
  amount: number;
  method: string;
  status: string;
  ticket: {
    description: string;
    subCategory: {
      name: string;
      category: {
        name: string;
      };
    };
  };
  invoice: {
    invoiceNumber: string;
    total: number;
  };
}

export interface CustomerFeedback {
  id: string;
  rating: number;
  review: string;
  createdAt: string;
  ticket: {
    ticketNumber: string;
    subCategory: {
      name: string;
      category: {
        name: string;
      };
    };
  };
}

export interface CustomerAsset {
  id: string;
  tenantId: string;
  customerId: string;
  categoryId: string | null;
  name: string;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  purchaseDate: string | null;
  installationDate: string | null;
  installationAddress: string | null;
  warrantyExpiresAt: string | null;
  qrCode: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category: { id: string; name: string } | null;
  /** True when this asset has a currently ACTIVE AMC subscription. */
  hasActiveAmc: boolean;
}

/** Returned by GET /mobile/customer/assets/:id — adds fields not present in the list response. */
export interface CustomerAssetDetail extends CustomerAsset {
  ticketCount: number;
  activeAmcPlanName: string | null;
}

export interface CustomerInvoice {
  id: string;
  invoiceNumber: string;
  subtotal: number;
  gstPercent: number;
  gstAmount: number;
  total: number;
  generatedAt: string;
  pdfUrl: string | null;
  ticket: {
    ticketNumber: string;
    description: string;
    priority: string;
    subCategory: {
      name: string;
      category: {
        name: string;
      };
    };
    technician?: {
      name: string;
      phone: string;
    } | null;
  };
  payment: {
    method: string;
    collectedAt: string;
    status: string;
  } | null;
}

/** Returned by GET /mobile/customer/invoices/:id — includes the itemized charge breakdown and
 * waiver flags needed to show "Covered by AMC" for AMC-billed tickets. */
export interface CustomerInvoiceDetail {
  id: string;
  invoiceNumber: string;
  serviceCharge: number;
  labourCharge: number;
  sparePartsAmount: number;
  additionalCharge: number;
  discount: number;
  subtotal: number;
  gstPercent: number;
  gstAmount: number;
  total: number;
  generatedAt: string;
  pdfUrl: string | null;
  ticket: {
    ticketNumber: string;
    description: string;
    priority: string;
    subCategory: {
      name: string;
      category: {
        name: string;
      };
    };
    technician?: {
      name: string;
      phone: string;
    } | null;
  };
  payment: {
    method: string;
    status: string;
    collectedAt: string | null;
    serviceChargeWaived: boolean;
    labourChargeWaived: boolean;
    sparePartsWaived: boolean;
  } | null;
}

export const CustomerService = {
  getDashboard: (): Promise<CustomerDashboardData> =>
    apiClient.get("/mobile/customer/dashboard").then((r) => r.data.data),

  getProfile: (): Promise<CustomerProfileData> =>
    apiClient.get("/mobile/customer/profile").then((r) => r.data.data),

  updateProfile: (payload: Partial<CustomerProfileData>): Promise<CustomerProfileData> =>
    apiClient.patch("/mobile/customer/profile", payload).then((r) => r.data.data),

  uploadProfilePhoto: (formData: FormData): Promise<{ profileImageUrl: string }> =>
    apiClient
      .post("/mobile/customer/profile/photo", formData, {
        // Let axios/React Native generate the multipart boundary itself — pinning
        // "multipart/form-data" without a boundary here produces a body the server can't parse.
        headers: { "Content-Type": undefined },
      })
      .then((r) => r.data.data),

  raiseTicket: async (formData: FormData): Promise<any> => {
    const { token } = useAuthStore.getState();
    const headers: Record<string, string> = {
      "x-tenant-code": APP_CONFIG.tenantCode,
      "Accept": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${APP_CONFIG.apiBaseUrl}/mobile/customer/tickets`, {
      method: "POST",
      headers,
      body: formData,
    });

    const resJson = await response.json();
    if (!response.ok) {
      throw new Error(resJson.message || "Failed to raise ticket");
    }
    return resJson.data;
  },

  getTickets: (status?: string): Promise<CustomerTicketDetail[]> =>
    apiClient
      .get("/mobile/customer/tickets", { params: { status } })
      .then((r) => r.data.data),

  getTicketDetails: (id: string): Promise<CustomerTicketDetail> =>
    apiClient.get(`/mobile/customer/tickets/${id}`).then((r) => r.data.data),

  cancelTicket: (id: string, reason: string): Promise<any> =>
    apiClient
      .patch(`/mobile/customer/tickets/${id}/cancel`, { reason })
      .then((r) => r.data.data),

  trackTicket: (id: string): Promise<{
    ticketId: string;
    status: string;
    technician: {
      id: string;
      name: string;
      phone: string;
      currentLat: number | null;
      currentLng: number | null;
      rating: number | null;
    } | null;
    statusHistory: TicketLog[];
  }> => apiClient.get(`/mobile/customer/tickets/${id}/track`).then((r) => r.data.data),

  getPayments: (): Promise<CustomerPayment[]> =>
    apiClient.get("/mobile/customer/payments").then((r) => r.data.data),

  getFeedbackList: (): Promise<CustomerFeedback[]> =>
    apiClient.get("/mobile/customer/feedback").then((r) => r.data.data),

  submitFeedback: (payload: { ticketId: string; rating: number; review: string }): Promise<any> =>
    apiClient.post("/mobile/customer/feedback", payload).then((r) => r.data.data),

  getInvoices: (): Promise<CustomerInvoice[]> =>
    apiClient.get("/mobile/customer/invoices").then((r) => r.data.data),

  getInvoiceDetails: (id: string): Promise<{
    invoice: CustomerInvoiceDetail;
    tenant: {
      companyName: string;
      email: string;
      phone: string;
      address: string;
      city: string;
      state: string;
      logoUrl: string | null;
    };
    settings?: any;
  }> => apiClient.get(`/mobile/customer/invoices/${id}`).then((r) => r.data.data),

  getAddresses: (): Promise<Address[]> =>
    apiClient.get("/mobile/customer/addresses").then((r) => r.data.data),

  getAssets: (): Promise<CustomerAsset[]> =>
    apiClient.get("/mobile/customer/assets").then((r) => r.data.data),

  getAssetById: (id: string): Promise<CustomerAssetDetail> =>
    apiClient.get(`/mobile/customer/assets/${id}`).then((r) => r.data.data),

  getCategories: (): Promise<any[]> =>
    apiClient.get("/categories").then((r) => r.data.data),

  getCategoryDetails: (id: string): Promise<any> =>
    apiClient.get(`/mobile/customer/catalog/categories/${id}`).then((r) => r.data.data),

  addAddress: (payload: { label: string; street: string; city: string; state?: string; country?: string; postalCode?: string }): Promise<Address> =>
    apiClient.post("/mobile/customer/addresses", payload).then((r) => r.data.data),

  updateAddress: (id: string, payload: { label?: string; street?: string; city?: string; state?: string; country?: string; postalCode?: string; isActive?: boolean }): Promise<Address> =>
    apiClient.patch(`/mobile/customer/addresses/${id}`, payload).then((r) => r.data.data),

  deleteAddress: (id: string): Promise<any> =>
    apiClient.delete(`/mobile/customer/addresses/${id}`).then((r) => r.data.data),
};
