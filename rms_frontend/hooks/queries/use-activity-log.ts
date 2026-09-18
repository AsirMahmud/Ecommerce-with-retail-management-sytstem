import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  activityLogApi,
  type ActivityLogQueryParams,
  type ActivityLogResponse,
} from '@/lib/api/activityLog';

export const ACTIVITY_LOG_QUERY_KEY = 'activity-log';

export const useActivityLog = (params?: ActivityLogQueryParams) => {
  return useQuery<ActivityLogResponse>({
    queryKey: [
      ACTIVITY_LOG_QUERY_KEY,
      {
        category: params?.category || 'all',
        search: params?.search || '',
        role: params?.role || 'all',
        limit: params?.limit || 100,
      },
    ],
    queryFn: async () => {
      return await activityLogApi.getLogs(params);
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: true,
  });
};
