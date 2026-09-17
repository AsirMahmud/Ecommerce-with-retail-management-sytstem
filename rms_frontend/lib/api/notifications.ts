import axiosInstance from './axios-config';

// ─── Types ───────────────────────────────────────────────────────────────────
export interface Notification {
    id: number;
    type: 'low_stock' | 'new_order' | 'payment' | 'system' | 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
    link?: string;
    metadata?: Record<string, any>;
}

export interface NotificationSummary {
    total: number;
    unread: number;
    notifications: Notification[];
}

// ─── Fallback: Generate notifications from existing data ─────────────────────
// Since the backend may not have a dedicated notifications endpoint yet,
// we aggregate alerts from existing sources (low stock, recent orders, etc.)

async function generateSmartNotifications(): Promise<NotificationSummary> {
    const notifications: Notification[] = [];

    try {
        // 1. Low stock alerts from inventory
        const stockRes = await axiosInstance.get('/inventory/products/', {
            params: { stock_status: 'low_stock', page_size: 5 },
        });
        const lowStockProducts = stockRes.data.results || [];
        lowStockProducts.forEach((p: any, i: number) => {
            notifications.push({
                id: 1000 + i,
                type: 'low_stock',
                title: 'Low Stock Alert',
                message: `${p.name} has only ${p.total_stock ?? 0} units left`,
                is_read: false,
                created_at: new Date().toISOString(),
                link: `/inventory/edit-product/${p.id}`,
                metadata: { product_id: p.id, stock: p.total_stock },
            });
        });
    } catch {
        // Inventory endpoint may fail — that's OK
    }

    try {
        // 2. Recent online preorders
        const preorderRes = await axiosInstance.get('/online-preorder/orders/', {
            params: { page_size: 3, ordering: '-created_at' },
        });
        const recentOrders = preorderRes.data.results || [];
        recentOrders.forEach((o: any, i: number) => {
            if (o.status === 'pending' || o.status === 'confirmed') {
                notifications.push({
                    id: 2000 + i,
                    type: 'new_order',
                    title: 'New Online Order',
                    message: `Order #${o.id} from ${o.customer_name || 'Customer'} — ৳${o.total_amount || 0}`,
                    is_read: false,
                    created_at: o.created_at || new Date().toISOString(),
                    link: `/online-preorders`,
                    metadata: { order_id: o.id },
                });
            }
        });
    } catch {
        // Online preorder endpoint may fail — that's OK
    }

    try {
        // 3. Due payments
        const dueRes = await axiosInstance.get('/sales/sales/due_sales/', {
            params: { page_size: 3 },
        });
        const dueSales = dueRes.data.results || [];
        if (dueSales.length > 0) {
            notifications.push({
                id: 3000,
                type: 'payment',
                title: 'Pending Due Payments',
                message: `You have ${dueRes.data.count || dueSales.length} sales with pending payments`,
                is_read: true,
                created_at: new Date().toISOString(),
                link: '/sales/due',
            });
        }
    } catch {
        // Due sales endpoint may fail — that's OK
    }

    // Sort by created_at descending
    notifications.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return {
        total: notifications.length,
        unread: notifications.filter((n) => !n.is_read).length,
        notifications,
    };
}

// ─── API Functions ───────────────────────────────────────────────────────────
export const notificationsApi = {
    /**
     * Get notifications — tries the dedicated endpoint first,
     * falls back to smart aggregation from existing data.
     */
    getAll: async (): Promise<NotificationSummary> => {
        try {
            // Try dedicated notifications endpoint first
            const { data } = await axiosInstance.get('/notifications/');
            return data;
        } catch {
            // Fallback: generate from existing data sources
            return generateSmartNotifications();
        }
    },

    /**
     * Mark a single notification as read
     */
    markAsRead: async (id: number): Promise<void> => {
        try {
            await axiosInstance.patch(`/notifications/${id}/`, { is_read: true });
        } catch {
            // Backend may not support this yet — silently succeed
        }
    },

    /**
     * Mark all notifications as read
     */
    markAllAsRead: async (): Promise<void> => {
        try {
            await axiosInstance.post('/notifications/mark-all-read/');
        } catch {
            // Backend may not support this yet — silently succeed
        }
    },
};
