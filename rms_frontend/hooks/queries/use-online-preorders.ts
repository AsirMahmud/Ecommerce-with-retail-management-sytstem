import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  onlinePreordersApi,
  type OnlinePreorder,
  type SteadfastFraudResult,
} from '@/lib/api/onlinePreorder';
import { toast } from 'sonner';

export const ONLINE_PREORDERS_QUERY_KEY = 'online-preorders';

/**
 * Hook to fetch and cache list of online preorders with 5-min staleTime and keepPreviousData.
 * Navigating between pages will return cached orders instantaneously with zero reload flash.
 */
export const useOnlinePreorders = (status?: string, search?: string) => {
  return useQuery({
    queryKey: [ONLINE_PREORDERS_QUERY_KEY, status || 'all', search || ''],
    queryFn: async () => {
      const res = await onlinePreordersApi.getAll(status, search);
      const data = Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
      return data as OnlinePreorder[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes in cache
    gcTime: 30 * 60 * 1000, // 30 minutes in garbage collection
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook to fetch a single online preorder by ID with caching.
 */
export const useOnlinePreorder = (id?: number) => {
  return useQuery({
    queryKey: [ONLINE_PREORDERS_QUERY_KEY, 'detail', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await onlinePreordersApi.getById(id);
      return res.data;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Mutation hook to update status of an online preorder with cache invalidation.
 */
export const useUpdateOnlinePreorderStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      onlinePreordersApi.updateStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [ONLINE_PREORDERS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [ONLINE_PREORDERS_QUERY_KEY, 'detail', variables.id] });
    },
  });
};

/**
 * Mutation hook to delete an online preorder with cache invalidation.
 */
export const useDeleteOnlinePreorder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => onlinePreordersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ONLINE_PREORDERS_QUERY_KEY] });
      toast.success('Order deleted successfully');
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.detail || 'Failed to delete order';
      toast.error(msg);
    },
  });
};

/**
 * Mutation hook to process return for an online preorder with cache invalidation.
 */
export const useProcessOnlinePreorderReturn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: {
        return_delivery_charge_paid_by_customer: boolean;
        return_charge_amount: number;
        return_reason: string;
      };
    }) => onlinePreordersApi.processReturn(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [ONLINE_PREORDERS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [ONLINE_PREORDERS_QUERY_KEY, 'detail', variables.id] });
      // Invalidate inventory products/variations since stock was restored
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
};

/**
 * Mutation hook to set hold on an online preorder with cache invalidation.
 */
export const useSetOnlinePreorderHold = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, holdReason }: { id: number; holdReason: string }) =>
      onlinePreordersApi.setHold(id, holdReason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [ONLINE_PREORDERS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [ONLINE_PREORDERS_QUERY_KEY, 'detail', variables.id] });
    },
  });
};
