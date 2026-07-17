import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AmcService, AmcSubscriptionStatus } from "../services/amc.service";

export const amcKeys = {
  all: ["amc"] as const,
  subscriptions: (filters?: { customerAssetId?: string; status?: AmcSubscriptionStatus; page?: number; limit?: number }) =>
    [...amcKeys.all, "subscriptions", filters] as const,
  subscriptionDetail: (id: string) => [...amcKeys.all, "subscriptions", id] as const,
};

export function useMyAmcSubscriptions(filters?: {
  customerAssetId?: string;
  status?: AmcSubscriptionStatus;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: amcKeys.subscriptions(filters),
    queryFn: () => AmcService.getMySubscriptions(filters),
  });
}

/** Resolves the active AMC subscription id for a given asset — used to jump straight from an
 * asset's "View AMC" button to its subscription detail without the customer picking from a list. */
export function useActiveAmcSubscriptionForAsset(customerAssetId: string) {
  return useQuery({
    queryKey: amcKeys.subscriptions({ customerAssetId, status: "ACTIVE" }),
    queryFn: () => AmcService.getMySubscriptions({ customerAssetId, status: "ACTIVE" }),
    enabled: !!customerAssetId,
    select: (result) => result.data[0] ?? null,
  });
}

export function useAmcSubscriptionDetail(id: string) {
  return useQuery({
    queryKey: amcKeys.subscriptionDetail(id),
    queryFn: () => AmcService.getSubscriptionById(id),
    enabled: !!id,
  });
}

export function useAmcSubscriptionDetails(subscriptionId: string) {
  return useQuery({
    queryKey: ["amcSubscriptionDetails", subscriptionId],
    queryFn: () => AmcService.getAmcSubscriptionDetails(subscriptionId),
    enabled: !!subscriptionId,
  });
}

export function useCancelAmcRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ subscriptionId, reason }: { subscriptionId: string; reason: string }) =>
      AmcService.cancelAmcRequest(subscriptionId, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: amcKeys.subscriptionDetail(variables.subscriptionId) });
      queryClient.invalidateQueries({ queryKey: ["amcSubscriptionDetails", variables.subscriptionId] });
      queryClient.invalidateQueries({ queryKey: amcKeys.all });
    },
  });
}
