import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CustomerService, CustomerProfileData } from "../services/customer.service";

export const customerKeys = {
  all: ["customer"] as const,
  dashboard: () => [...customerKeys.all, "dashboard"] as const,
  profile: () => [...customerKeys.all, "profile"] as const,
  tickets: (status?: string) => [...customerKeys.all, "tickets", { status }] as const,
  ticket: (id: string) => [...customerKeys.all, "ticket", id] as const,
  payments: () => [...customerKeys.all, "payments"] as const,
  feedback: () => [...customerKeys.all, "feedback"] as const,
  invoices: () => [...customerKeys.all, "invoices"] as const,
  invoice: (id: string) => [...customerKeys.all, "invoice", id] as const,
  addresses: () => [...customerKeys.all, "addresses"] as const,
  assets: () => [...customerKeys.all, "assets"] as const,
  asset: (id: string) => [...customerKeys.all, "assets", id] as const,
  categories: () => ["categories"] as const,
  category: (id: string) => ["category", id] as const,
};

export function useCustomerDashboard() {
  return useQuery({
    queryKey: customerKeys.dashboard(),
    queryFn: () => CustomerService.getDashboard(),
  });
}

export function useCustomerProfile() {
  return useQuery({
    queryKey: customerKeys.profile(),
    queryFn: () => CustomerService.getProfile(),
  });
}

export function useUpdateCustomerProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<CustomerProfileData>) => CustomerService.updateProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.profile() });
    },
  });
}

export function useUploadCustomerProfilePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => CustomerService.uploadProfilePhoto(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.profile() });
    },
  });
}

export function useRaiseCustomerTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => CustomerService.raiseTicket(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.tickets() });
      queryClient.invalidateQueries({ queryKey: customerKeys.dashboard() });
    },
  });
}

export function useCustomerTickets(status?: string) {
  return useQuery({
    queryKey: customerKeys.tickets(status),
    queryFn: () => CustomerService.getTickets(status),
  });
}

export function useCustomerTicketDetails(id: string, options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: customerKeys.ticket(id),
    queryFn: () => CustomerService.getTicketDetails(id),
    enabled: !!id,
    refetchInterval: options?.refetchInterval,
  });
}

export function useCancelCustomerTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      CustomerService.cancelTicket(id, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.ticket(variables.id) });
      queryClient.invalidateQueries({ queryKey: customerKeys.tickets() });
      queryClient.invalidateQueries({ queryKey: customerKeys.dashboard() });
    },
  });
}


export function useCustomerPayments() {
  return useQuery({
    queryKey: customerKeys.payments(),
    queryFn: () => CustomerService.getPayments(),
  });
}

export function useCustomerFeedbackList() {
  return useQuery({
    queryKey: customerKeys.feedback(),
    queryFn: () => CustomerService.getFeedbackList(),
  });
}

export function useSubmitCustomerFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { ticketId: string; rating: number; review: string }) =>
      CustomerService.submitFeedback(payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.feedback() });
      queryClient.invalidateQueries({ queryKey: customerKeys.ticket(variables.ticketId) });
      queryClient.invalidateQueries({ queryKey: customerKeys.tickets() });
    },
  });
}

export function useCustomerInvoices() {
  return useQuery({
    queryKey: customerKeys.invoices(),
    queryFn: () => CustomerService.getInvoices(),
  });
}

export function useCustomerInvoiceDetails(id: string) {
  return useQuery({
    queryKey: customerKeys.invoice(id),
    queryFn: () => CustomerService.getInvoiceDetails(id),
    enabled: !!id,
  });
}

export function useCustomerAddresses() {
  return useQuery({
    queryKey: customerKeys.addresses(),
    queryFn: () => CustomerService.getAddresses(),
  });
}

export function useAddCustomerAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { label: string; street: string; city: string; state?: string; country?: string; postalCode?: string }) =>
      CustomerService.addAddress(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.addresses() });
    },
  });
}

export function useUpdateCustomerAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { label?: string; street?: string; city?: string; state?: string; country?: string; postalCode?: string; isActive?: boolean } }) =>
      CustomerService.updateAddress(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.addresses() });
    },
  });
}

export function useDeleteCustomerAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => CustomerService.deleteAddress(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.addresses() });
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: customerKeys.categories(),
    queryFn: () => CustomerService.getCategories(),
  });
}

export function useCategoryDetails(id: string) {
  return useQuery({
    queryKey: customerKeys.category(id),
    queryFn: () => CustomerService.getCategoryDetails(id),
    enabled: !!id,
  });
}

export function useCustomerAssets() {
  return useQuery({
    queryKey: customerKeys.assets(),
    queryFn: () => CustomerService.getAssets(),
  });
}

/** Central source of truth for "does this customer have an active AMC on any asset" —
 * drives the bottom navigation (Assets tab vs Tickets tab) and header ticket icon. Derived from
 * the same assets query used by the Assets screen (shared cache — no duplicate network call),
 * so it recomputes automatically after login or whenever asset/AMC data is refetched. */
export function useCustomerHasActiveAmc() {
  const { data: assets, isLoading, isFetched } = useCustomerAssets();
  const hasActiveAmc = !!assets?.some((asset) => asset.hasActiveAmc);
  return { hasActiveAmc, isLoading, isFetched };
}

export function useCustomerAssetDetail(id: string) {
  return useQuery({
    queryKey: customerKeys.asset(id),
    queryFn: () => CustomerService.getAssetById(id),
    enabled: !!id,
  });
}
