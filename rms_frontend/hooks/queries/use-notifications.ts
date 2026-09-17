import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api/notifications';

export const NOTIFICATIONS_KEY = ['notifications'];

export function useNotifications() {
    return useQuery({
        queryKey: NOTIFICATIONS_KEY,
        queryFn: notificationsApi.getAll,
        refetchInterval: 60 * 1000, // Refetch every 60 seconds
        staleTime: 30 * 1000,       // Consider stale after 30 seconds
    });
}

export function useMarkNotificationRead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: notificationsApi.markAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
        },
    });
}

export function useMarkAllNotificationsRead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: notificationsApi.markAllAsRead,
        onMutate: async () => {
            // Optimistic update
            await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_KEY });
            const prev = queryClient.getQueryData(NOTIFICATIONS_KEY);
            queryClient.setQueryData(NOTIFICATIONS_KEY, (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    unread: 0,
                    notifications: old.notifications.map((n: any) => ({
                        ...n,
                        is_read: true,
                    })),
                };
            });
            return { prev };
        },
        onError: (_err, _vars, ctx) => {
            if (ctx?.prev) {
                queryClient.setQueryData(NOTIFICATIONS_KEY, ctx.prev);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
        },
    });
}
