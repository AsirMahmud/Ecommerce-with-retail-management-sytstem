import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  onlinePreordersApi,
  type OnlinePreorder,
  type OnlinePreordersQueryParams,
  type PaginatedResponse,
  type OnlinePreorderMetrics,
} from '@/lib/api/onlinePreorder';
import { toast } from 'sonner';

export const ONLINE_PREORDERS_QUERY_KEY = 'online-preorders';
export const ONLINE_PREORDER_METRICS_QUERY_KEY = 'online-preorder-metrics';

/**
 * Hook to fetch and cache list of online preorders with pagination, sorting, and multi-filters.
 * Uses keepPreviousData so navigating between pages or filters updates seamlessly with zero layout flash.
 */
export const useOnlinePreorders = (
  paramsOrStatus?: OnlinePreordersQueryParams | string,
  legacySearch?: string
) => {
  const params: OnlinePreordersQueryParams =
    typeof paramsOrStatus === 'string'
      ? { status: paramsOrStatus, search: legacySearch }
      : (paramsOrStatus || {});

  const page = params.page || 1;
  const pageSize = params.pageSize || 15;

  const query = useQuery({
    queryKey: [
      ONLINE_PREORDERS_QUERY_KEY,
      {
        page,
        pageSize,
        status: params.status || 'all',
        search: params.search || '',
        courierPartner: params.courierPartner || 'all',
        dateFrom: params.dateFrom || '',
        dateTo: params.dateTo || '',
        ordering: params.ordering || '-created_at',
      },
    ],
    queryFn: async () => {
      const res = await onlinePreordersApi.getAll(params);
      return res.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes in cache
    gcTime: 30 * 60 * 1000, // 30 minutes in garbage collection
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });

  const rawData = query.data;
  let orders: OnlinePreorder[] = [];
  let totalCount = 0;

  if (Array.isArray(rawData)) {
    orders = rawData;
    totalCount = rawData.length;
  } else if (rawData && typeof rawData === 'object' && 'results' in rawData) {
    orders = rawData.results || [];
    totalCount = rawData.count || 0;
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return {
    ...query,
    orders,
    totalCount,
    page,
    pageSize,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

/**
 * Hook to fetch high-level real-time metrics across all online preorders.
 */
export const useOnlinePreorderMetrics = (dateRange?: { dateFrom?: string; dateTo?: string }) => {
  return useQuery({
    queryKey: [ONLINE_PREORDER_METRICS_QUERY_KEY, dateRange?.dateFrom || '', dateRange?.dateTo || ''],
    queryFn: async () => {
      const res = await onlinePreordersApi.getMetrics(dateRange);
      return res.data;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
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
