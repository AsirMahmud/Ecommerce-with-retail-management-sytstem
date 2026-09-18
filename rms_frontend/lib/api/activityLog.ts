import axiosInstance from './axios-config';

export interface ActivityEntry {
  id: string;
  user: {
    name: string;
    email: string;
    role: "Admin" | "Cashier" | "Inventory Lead" | "System";
    initials: string;
  };
  category: "Sales" | "Inventory" | "Pricing" | "Returns" | "Security";
  action: string;
  description: string;
  target?: string;
  diff?: {
    before?: string | number;
    after?: string | number;
  };
  ipAddress: string;
  device: string;
  timestamp: string;
}

export interface ActivityLogMetrics {
  total_24h: number;
  sales_24h: number;
  stock_24h: number;
  expenses_and_other_24h: number;
}

export interface ActivityLogResponse {
  metrics: ActivityLogMetrics;
  count: number;
  results: ActivityEntry[];
}

export interface ActivityLogQueryParams {
  category?: string;
  search?: string;
  role?: string;
  limit?: number;
}

export const activityLogApi = {
  getLogs: async (params?: ActivityLogQueryParams): Promise<ActivityLogResponse> => {
    const query = new URLSearchParams();
    if (params?.category && params.category !== 'all') {
      query.append('category', params.category);
    }
    if (params?.search) {
      query.append('search', params.search);
    }
    if (params?.role && params.role !== 'all') {
      query.append('role', params.role);
    }
    if (params?.limit) {
      query.append('limit', String(params.limit));
    }

    const qs = query.toString();
    const url = `/dashboard/activity-log/${qs ? `?${qs}` : ''}`;
    const res = await axiosInstance.get<ActivityLogResponse>(url);
    return res.data;
  },
};
