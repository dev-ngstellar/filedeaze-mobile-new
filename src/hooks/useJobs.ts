import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { JobService, TicketStatus, Ticket, SparePartCoverageType } from "../services/job.service";

// ==========================================
// QUERY KEYS
// ==========================================

export const jobQueryKeys = {
  all: ["work-orders"] as const,
  technicianList: (month?: number, year?: number) => [...jobQueryKeys.all, "tech-list", month, year] as const,
  customerList: (mobile: string) => [...jobQueryKeys.all, "cust-list", mobile] as const,
  details: (ticketNo: string) => [...jobQueryKeys.all, "detail", ticketNo] as const,
  attendance: () => ["attendance"] as const,
  attendanceHistory: (month?: number, year?: number) =>
    ["attendance-history", month, year] as const,
  invoices: (mobile: string) => ["invoices", mobile] as const,
};

// ==========================================
// TECHNICIAN — TICKET HOOKS
// ==========================================

export function useTechnicianJobs(month?: number, year?: number) {
  return useQuery({
    queryKey: jobQueryKeys.technicianList(month, year),
    queryFn: () => JobService.getTechnicianJobs(month, year),
    staleTime: 10_000,
  });
}

export function useTechnicianInvoices(month?: number, year?: number) {
  return useQuery({
    queryKey: ["technician-invoices", month, year],
    queryFn: () => JobService.getTechnicianInvoices(month, year),
    staleTime: 10_000,
  });
}

export function useJobDetails(ticketNo: string) {
  return useQuery({
    queryKey: jobQueryKeys.details(ticketNo),
    queryFn: () => JobService.getJobDetails(ticketNo),
    enabled: !!ticketNo,
  });
}

export function useUpdateJobStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ticketId, status }: { ticketId: string; status: TicketStatus }) => // CHANGED: Rename ticketNo to ticketId for UUID routing
      JobService.updateJobStatus(ticketId, status), // CHANGED: Rename ticketNo to ticketId for UUID routing
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: jobQueryKeys.technicianList() });
      queryClient.invalidateQueries({ queryKey: jobQueryKeys.details(data.ticketNo) });
    },
  });
}

export function useRejectJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ticketId, reason }: { ticketId: string; reason: string }) => // CHANGED: Rename ticketNo to ticketId for UUID routing
      JobService.rejectJob(ticketId, reason), // CHANGED: Rename ticketNo to ticketId for UUID routing
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: jobQueryKeys.technicianList() });
      queryClient.invalidateQueries({ queryKey: jobQueryKeys.details(vars.ticketId) }); // CHANGED: Use vars.ticketId instead of vars.ticketNo
    },
  });
}

export function useUploadTicketImage() {
  return useMutation({
    mutationFn: ({
      ticketNo,
      imageUri,
      type,
    }: {
      ticketNo: string;
      imageUri: string;
      type: "BEFORE" | "AFTER";
    }) => JobService.uploadTicketImage(ticketNo, imageUri, type),
  });
}

export function useSaveBeforePhotos() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ticketNo, photos }: { ticketNo: string; photos: string[] }) =>
      JobService.saveBeforePhotos(ticketNo, photos),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: jobQueryKeys.technicianList() });
      queryClient.invalidateQueries({ queryKey: jobQueryKeys.details(data.ticketNo) });
    },
  });
}

export function useCompleteJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      ticketNo,
      payload,
    }: {
      ticketNo: string;
      payload: {
        beforePhotos: string[];
        afterPhotos: string[];
        customerSignature: string;
        workNotes: string;
        duration: string;
        paymentCollection?: number;
        paymentMethod?: string;
        lat?: number;
        lng?: number;
        sparePartsUsed?: { sparePartId: string; quantity: number; warrantyStatus: SparePartCoverageType }[];
      };
    }) => JobService.completeJob(ticketNo, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: jobQueryKeys.technicianList() });
      queryClient.invalidateQueries({ queryKey: jobQueryKeys.details(data.ticketNo) });
      if (data.customerMobile) {
        queryClient.invalidateQueries({
          queryKey: jobQueryKeys.customerList(data.customerMobile),
        });
        queryClient.invalidateQueries({
          queryKey: jobQueryKeys.invoices(data.customerMobile),
        });
      }
    },
  });
}

export function useMarkJobPending() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      ticketNo,
      pendingReason,
      notes,
      photos,
    }: {
      ticketNo: string;
      pendingReason: string;
      notes?: string;
      photos?: string[];
    }) => JobService.markJobPending(ticketNo, pendingReason, notes, photos),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: jobQueryKeys.technicianList() });
      queryClient.invalidateQueries({ queryKey: jobQueryKeys.details(data.ticketNo) });
    },
  });
}

/** Live, backend-computed GST-inclusive breakdown for the payment step — refetches whenever the
 * technician-entered charges change so the AMC waiver / final amount shown is never client-math. */
export function usePaymentPreview(
  ticketNo: string,
  params: { serviceCharge: number; labourCharge?: number; additionalCharge?: number; discount?: number },
  enabled: boolean
) {
  return useQuery({
    queryKey: [
      "payment-preview",
      ticketNo,
      params.serviceCharge,
      params.labourCharge,
      params.additionalCharge,
      params.discount,
    ],
    queryFn: () => JobService.previewPayment(ticketNo, params),
    enabled: enabled && !!ticketNo && params.serviceCharge >= 0,
  });
}

export function useCollectPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      ticketNo,
      payload,
    }: {
      ticketNo: string;
      payload: {
        serviceCharge: number;
        labourCharge?: number;
        additionalCharge?: number;
        discount?: number;
        warrantyParts?: { sparePartId: string; quantity: number }[];
        nonWarrantyParts?: { sparePartId: string; quantity: number }[];
        method: string;
      };
    }) => JobService.collectPayment(ticketNo, payload),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: jobQueryKeys.technicianList() });
      queryClient.invalidateQueries({ queryKey: jobQueryKeys.details(vars.ticketNo) });
    },
  });
}

/** Spare-parts catalog for a ticket's service. Gracefully surfaces isError/error instead of
 * throwing — see JobService.getSparePartsForSubCategory's TODO: the technician-scoped listing
 * endpoint doesn't exist on the backend yet, so this legitimately fails until that's added. */
export function useSparePartsCatalog(subCategoryId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["spare-parts-catalog", subCategoryId],
    queryFn: () => JobService.getSparePartsForSubCategory(subCategoryId as string),
    enabled: enabled && !!subCategoryId,
    retry: false,
  });
}

export function useRescheduleJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ticketNo, nextVisitDate }: { ticketNo: string; nextVisitDate: string }) =>
      JobService.rescheduleJob(ticketNo, nextVisitDate),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: jobQueryKeys.technicianList() });
      queryClient.invalidateQueries({ queryKey: jobQueryKeys.details(data.ticketNo) });
    },
  });
}

// ==========================================
// ATTENDANCE HOOKS
// ==========================================

export function useAttendanceStatus() {
  return useQuery({
    queryKey: jobQueryKeys.attendance(),
    queryFn: () => JobService.getAttendanceStatus(),
    staleTime: 30_000,
  });
}

export function useAttendanceHistory(month?: number, year?: number) {
  return useQuery({
    queryKey: jobQueryKeys.attendanceHistory(month, year),
    queryFn: () => JobService.getAttendanceHistory(month, year),
    staleTime: 60_000,
  });
}

export function useCheckIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      location,
      latitude,
      longitude,
    }: {
      location: string;
      latitude?: number;
      longitude?: number;
    }) => JobService.checkIn(location, latitude, longitude),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobQueryKeys.attendance() });
      queryClient.invalidateQueries({ queryKey: jobQueryKeys.attendanceHistory() });
      queryClient.invalidateQueries({ queryKey: jobQueryKeys.technicianList() });
    },
  });
}

export function useCheckOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      latitude,
      longitude,
    }: {
      latitude?: number;
      longitude?: number;
    } = {}) => JobService.checkOut(latitude, longitude),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobQueryKeys.attendance() });
      queryClient.invalidateQueries({ queryKey: jobQueryKeys.attendanceHistory() });
      queryClient.invalidateQueries({ queryKey: jobQueryKeys.technicianList() });
    },
  });
}

// ==========================================
// CUSTOMER HOOKS
// ==========================================

export function useCustomerTickets(mobile: string) {
  return useQuery({
    queryKey: jobQueryKeys.customerList(mobile),
    queryFn: () => JobService.getCustomerTickets(mobile),
    enabled: !!mobile,
  });
}

export function useCustomerInvoices(mobile: string) {
  return useQuery({
    queryKey: jobQueryKeys.invoices(mobile),
    queryFn: () => JobService.getCustomerInvoices(mobile),
    enabled: !!mobile,
  });
}

export function useRaiseTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      customerName: string;
      customerMobile: string;
      category: string;
      subCategory: string;
      description: string;
      address: string;
      images?: string[];
    }) => JobService.raiseTicket(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: jobQueryKeys.customerList(data.customerMobile),
      });
      queryClient.invalidateQueries({ queryKey: jobQueryKeys.technicianList() });
    },
  });
}
