import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi, Notification } from '@/lib/api/notifications';

export const NOTIFICATIONS_KEY = ['notifications'];

export function useNotifications() {
    return useQuery({
        queryKey: NOTIFICATIONS_KEY,
        queryFn: notificationsApi.getAll,
        refetchInterval: 60 * 1000, // Refetch every 60 seconds
        staleTime: 20 * 1000,       // Consider stale after 20 seconds
    });
}

export function useMarkNotificationRead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string | number) => notificationsApi.markAsRead(id),
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_KEY });
            const prev = queryClient.getQueryData(NOTIFICATIONS_KEY);
            queryClient.setQueryData(NOTIFICATIONS_KEY, (old: any) => {
                if (!old) return old;
                const updatedList = old.notifications.map((n: Notification) =>
                    String(n.id) === String(id) ? { ...n, is_read: true } : n
                );
                return {
                    ...old,
                    unread: updatedList.filter((n: Notification) => !n.is_read).length,
                    notifications: updatedList,
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

export function useMarkAllNotificationsRead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (ids?: (string | number)[]) => notificationsApi.markAllAsRead(ids),
        onMutate: async () => {
            // Optimistic update
            await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_KEY });
            const prev = queryClient.getQueryData(NOTIFICATIONS_KEY);
            queryClient.setQueryData(NOTIFICATIONS_KEY, (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    unread: 0,
                    notifications: old.notifications.map((n: Notification) => ({
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

export function useDismissNotification() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string | number) => notificationsApi.dismissNotification(id),
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_KEY });
            const prev = queryClient.getQueryData(NOTIFICATIONS_KEY);
            queryClient.setQueryData(NOTIFICATIONS_KEY, (old: any) => {
                if (!old) return old;
                const updatedList = old.notifications.filter(
                    (n: Notification) => String(n.id) !== String(id)
                );
                return {
                    ...old,
                    total: updatedList.length,
                    unread: updatedList.filter((n: Notification) => !n.is_read).length,
                    notifications: updatedList,
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

export function useClearAllRead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (readIds: (string | number)[]) => notificationsApi.clearAllRead(readIds),
        onMutate: async (readIds) => {
            await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_KEY });
            const prev = queryClient.getQueryData(NOTIFICATIONS_KEY);
            const readSet = new Set(readIds.map(String));
            queryClient.setQueryData(NOTIFICATIONS_KEY, (old: any) => {
                if (!old) return old;
                const updatedList = old.notifications.filter(
                    (n: Notification) => !readSet.has(String(n.id))
                );
                return {
                    ...old,
                    total: updatedList.length,
                    unread: updatedList.filter((n: Notification) => !n.is_read).length,
                    notifications: updatedList,
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
