import { apiClient } from "../api/client";

export type AmcSubscriptionStatus =
  | "PENDING_APPROVAL"
  | "PAYMENT_PENDING"
  | "ACTIVE"
  | "REJECTED"
  | "RENEWED"
  | "CANCELLED";

export interface AmcSubscription {
  id: string;
  tenantId: string;
  customerAssetId: string;
  planId: string;
  customerId: string;
  startDate: string | null;
  endDate: string | null;
  contractTotalVisits: number;
  remainingVisits: number;
  contractPrice: string;
  contractDurationMonths: number;
  contractCoverageTerms: string | null;
  status: AmcSubscriptionStatus;
  requestedAt: string;
  requestNotes: string | null;
  preferredStartDate: string | null;
  convertedFromWarranty: boolean;
  approvedAt: string | null;
  approvedBy: string | null;
  rejectedAt: string | null;
  rejectedBy: string | null;
  rejectionReason: string | null;
  paymentVerifiedAt: string | null;
  paymentVerifiedBy: string | null;
  renewedFromId: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
  plan: {
    id: string;
    name: string;
    durationMonths: number;
    visitCount: number;
    price: string;
    description?: string | null;
    coverageTerms?: string | null;
  };
  customerAsset: {
    id: string;
    name: string;
    brand: string;
    model: string;
    serialNumber?: string | null;
  };
  customer: {
    id: string;
    name: string;
    phone: string;
  };
}

export type AmcVisitStatus =
  | "SCHEDULED"
  | "COMPLETED"
  | "CANCELLED"
  | "RESCHEDULED"
  | "NO_SHOW";

export interface AmcVisit {
  id: string;
  tenantId: string;
  subscriptionId: string;
  visitNumber: number;
  scheduledDate: string | null;
  completedDate: string | null;
  status: AmcVisitStatus;
  notes: string | null;
  technicianId: string | null;
  createdAt: string;
  updatedAt: string;
  ticket: {
    id: string;
    ticketNumber: string;
    status: string;
  } | null;
}

/** Full detail response returned by GET /mobile/customer/amc/subscriptions/:id */
export interface AmcSubscriptionDetail extends AmcSubscription {
  visits: AmcVisit[];
}

export const AmcService = {
  /**
   * GET /mobile/customer/amc/subscriptions
   * Lists all customer AMC subscriptions (contracts) with optional filters and pagination.
   */
  getMySubscriptions: async (filters?: {
    customerAssetId?: string;
    status?: AmcSubscriptionStatus;
    page?: number;
    limit?: number;
  }): Promise<{ data: AmcSubscription[]; total?: number }> => {
    const res = await apiClient.get<any>("/mobile/customer/amc/subscriptions", {
      params: filters,
    });

    // The NestJS AMC list service returns: { items: [...], meta: { total, page, limit } }
    // (via paginatedResponse helper — NOT wrapped in { data: ... })
    // Guard against all shapes just in case:
    const body = res.data;

    let list: AmcSubscription[] = [];
    let total: number | undefined;

    if (Array.isArray(body)) {
      // bare array
      list = body;
    } else if (body && Array.isArray(body.items)) {
      // { items: [...], meta: { total } }  ← actual backend shape
      list = body.items;
      total = body.meta?.total ?? body.total;
    } else if (body && Array.isArray(body.data)) {
      // { data: [...] }
      list = body.data;
      total = body.total;
    } else if (body?.data && Array.isArray(body.data.items)) {
      // { data: { items: [...], meta: { total } } }
      list = body.data.items;
      total = body.data.meta?.total ?? body.data.total;
    }

    return { data: list, total: total ?? list.length };
  },

  /**
   * GET /mobile/customer/amc/subscriptions/:id
   * Returns the full detail of a single AMC subscription including visit history.
   */
  getSubscriptionById: async (id: string): Promise<AmcSubscriptionDetail> => {
    const res = await apiClient.get<any>(`/mobile/customer/amc/subscriptions/${id}`);
    return res.data?.data ?? res.data;
  },

  /**
   * GET /mobile/customer/amc/subscriptions/:id (explicit for API 3 detail flow)
   * Returns the full detail of a single AMC subscription including visit history.
   */
  getAmcSubscriptionDetails: async (subscriptionId: string): Promise<AmcSubscriptionDetail> => {
    try {
      const res = await apiClient.get<any>(`/mobile/customer/amc/subscriptions/${subscriptionId}`);
      return res.data?.data ?? res.data;
    } catch (error) {
      console.error("[AMC SERVICE] Error fetching subscription details:", error);
      throw error;
    }
  },

  /**
   * POST /mobile/customer/amc/:id/cancel-request
   * Cancels a pending AMC subscription request.
   */
  cancelAmcRequest: async (subscriptionId: string, reason: string): Promise<any> => {
    try {
      const res = await apiClient.post<any>(`/mobile/customer/amc/${subscriptionId}/cancel-request`, { reason });
      return res.data?.data ?? res.data;
    } catch (error) {
      console.error("[AMC SERVICE] Error cancelling AMC request:", error);
      throw error;
    }
  },
};

export interface CancelAmcRequestPayload {
  reason: string;
}

export default AmcService;
