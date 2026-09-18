import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { DashboardStats } from "@/types/dashboard";

export interface CustomDateRange {
    startDate?: string;
    endDate?: string;
}

export function useDashboard(period: string = "today", customDates?: CustomDateRange) {
    return useQuery<DashboardStats>({
        queryKey: ["dashboard-stats", period, customDates?.startDate, customDates?.endDate],
        queryFn: async () => {
            try {
                const params: Record<string, string> = { period };
                if (period === "custom" && customDates?.startDate && customDates?.endDate) {
                    params.start_date = customDates.startDate;
                    params.end_date = customDates.endDate;
                }
                const response = await api.get("/dashboard/stats/", { params });
                return response.data;
            } catch (error) {
                console.error("Dashboard data fetch error:", error);
                throw error;
            }
        },
        refetchInterval: 180000, // Refetch every 3 minutes
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 15000),
        staleTime: 30000, // Data fresh for 30s
        gcTime: 300000, // Cache for 5m
    });
}