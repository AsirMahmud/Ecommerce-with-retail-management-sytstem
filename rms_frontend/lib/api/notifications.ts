import axiosInstance from './axios-config';

// ─── Types ───────────────────────────────────────────────────────────────────
export interface Notification {
    id: string | number;
    type: 'low_stock' | 'new_order' | 'payment' | 'system' | 'info' | 'success' | 'warning' | 'error' | 'return';
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
    link?: string;
    priority?: 'urgent' | 'high' | 'medium' | 'low';
    category?: 'inventory' | 'orders' | 'finance' | 'system';
    metadata?: Record<string, any>;
}

export interface NotificationSummary {
    total: number;
    unread: number;
    notifications: Notification[];
}

// ─── Local Storage Keys & Helpers ────────────────────────────────────────────
const STORAGE_KEYS = {
    READ: 'rms_read_notifications_v2',
    DISMISSED: 'rms_dismissed_notifications_v2',
    SOUND: 'rms_notification_sound_enabled',
};

export function getStoredReadIds(): Set<string> {
    if (typeof window === 'undefined') return new Set();
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.READ);
        return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
        return new Set();
    }
}

export function saveStoredReadId(id: string | number) {
    if (typeof window === 'undefined') return;
    try {
        const set = getStoredReadIds();
        set.add(String(id));
        localStorage.setItem(STORAGE_KEYS.READ, JSON.stringify(Array.from(set)));
    } catch {
        // Ignore storage errors
    }
}

export function saveAllStoredReadIds(ids: (string | number)[]) {
    if (typeof window === 'undefined') return;
    try {
        const set = getStoredReadIds();
        ids.forEach((id) => set.add(String(id)));
        localStorage.setItem(STORAGE_KEYS.READ, JSON.stringify(Array.from(set)));
    } catch {
        // Ignore storage errors
    }
}

export function getStoredDismissedIds(): Set<string> {
    if (typeof window === 'undefined') return new Set();
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.DISMISSED);
        return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
        return new Set();
    }
}

export function saveStoredDismissedId(id: string | number) {
    if (typeof window === 'undefined') return;
    try {
        const set = getStoredDismissedIds();
        set.add(String(id));
        localStorage.setItem(STORAGE_KEYS.DISMISSED, JSON.stringify(Array.from(set)));
    } catch {
        // Ignore storage errors
    }
}

export function isSoundEnabled(): boolean {
    if (typeof window === 'undefined') return true;
    try {
        const val = localStorage.getItem(STORAGE_KEYS.SOUND);
        return val !== null ? JSON.parse(val) : true;
    } catch {
        return true;
    }
}

export function setSoundEnabled(enabled: boolean): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEYS.SOUND, JSON.stringify(enabled));
    } catch {
        // Ignore storage errors
    }
}

// ─── Smart Aggregation Engine ────────────────────────────────────────────────
async function generateSmartNotifications(): Promise<NotificationSummary> {
    const notifications: Notification[] = [];
    const readIds = getStoredReadIds();
    const dismissedIds = getStoredDismissedIds();

    // 1. Online Preorders (high operational relevance)
    try {
        const preorderRes = await axiosInstance.get('/online-preorder/orders/', {
            params: { page_size: 6, ordering: '-created_at' },
        });
        const recentOrders = preorderRes.data.results || [];
        recentOrders.forEach((o: any) => {
            const notifId = `preorder-${o.id}`;
            if (dismissedIds.has(notifId)) return;

            const isPending = o.status === 'pending';
            const formattedTotal = Number(o.total_amount || 0).toLocaleString();
            notifications.push({
                id: notifId,
                type: 'new_order',
                category: 'orders',
                priority: isPending ? 'high' : 'medium',
                title: `Preorder #${o.id} • ${o.customer_name || 'Customer'}`,
                message: `Order for ৳${formattedTotal} (${(o.status || 'Pending').toUpperCase()}) • Phone: ${o.customer_phone || 'N/A'}`,
                is_read: readIds.has(notifId),
                created_at: o.created_at || new Date().toISOString(),
                link: '/online-preorders',
                metadata: { order_id: o.id, amount: o.total_amount, status: o.status },
            });
        });
    } catch {
        // Gracefully ignore if offline
    }

    // 2. Low Stock Alerts (deduplicated by product ID with real timestamps)
    try {
        const stockRes = await axiosInstance.get('/inventory/products/', {
            params: { stock_status: 'low_stock', page_size: 8 },
        });
        const lowStockProducts = stockRes.data.results || [];
        const seenProductIds = new Set<number>();

        lowStockProducts.forEach((p: any) => {
            if (seenProductIds.has(p.id)) return;
            seenProductIds.add(p.id);

            const notifId = `stock-${p.id}`;
            if (dismissedIds.has(notifId)) return;

            const stock = Number(p.total_stock ?? p.stock_quantity ?? 0);
            const minStock = Number(p.minimum_stock ?? 10);
            const isCritical = stock <= 0;

            notifications.push({
                id: notifId,
                type: 'low_stock',
                category: 'inventory',
                priority: isCritical ? 'urgent' : 'high',
                title: isCritical ? `Out of Stock: ${p.name}` : `Low Stock: ${p.name}`,
                message: `${p.name}${p.sku ? ` (${p.sku})` : ''} has ${stock} units remaining (Threshold: ${minStock})`,
                is_read: readIds.has(notifId),
                created_at: p.updated_at || p.created_at || new Date(Date.now() - 3600000).toISOString(),
                link: `/inventory/edit-product/${p.id}`,
                metadata: { product_id: p.id, stock, min_stock: minStock },
            });
        });
    } catch {
        // Gracefully ignore
    }

    // 3. Due Sales (finance notifications)
    try {
        const dueRes = await axiosInstance.get('/sales/sales/due_sales/', {
            params: { page_size: 4 },
        });
        const dueSales = dueRes.data.results || [];
        dueSales.forEach((s: any) => {
            const notifId = `due-sale-${s.id}`;
            if (dismissedIds.has(notifId)) return;

            const dueAmount = Number(s.amount_due ?? s.due_amount ?? s.total ?? 0).toLocaleString();
            const custName = s.customer ? `${s.customer.first_name || ''} ${s.customer.last_name || ''}`.trim() : (s.customer_phone || 'Walk-in');

            notifications.push({
                id: notifId,
                type: 'payment',
                category: 'finance',
                priority: 'medium',
                title: `Pending Due: ${s.invoice_number || `Sale #${s.id}`}`,
                message: `Due balance of ৳${dueAmount} pending collection from ${custName}`,
                is_read: readIds.has(notifId),
                created_at: s.date || s.created_at || new Date(Date.now() - 7200000).toISOString(),
                link: '/sales/due',
                metadata: { sale_id: s.id, invoice: s.invoice_number, due: dueAmount },
            });
        });
    } catch {
        // Gracefully ignore
    }

    // 4. Critical Activity Log Items (returns, expenses, system events)
    try {
        const actRes = await axiosInstance.get('/dashboard/activity-log/', {
            params: { limit: 8 },
        });
        const activities = actRes.data.activities || [];
        activities.forEach((act: any) => {
            if (act.action?.toLowerCase().includes('return')) {
                const notifId = `return-${act.id}`;
                if (dismissedIds.has(notifId)) return;
                notifications.push({
                    id: notifId,
                    type: 'return',
                    category: 'finance',
                    priority: 'medium',
                    title: `Sale Return Processed`,
                    message: act.description || `Return processed: ${act.target}`,
                    is_read: readIds.has(notifId),
                    created_at: act.timestamp || new Date().toISOString(),
                    link: '/sales',
                    metadata: { target: act.target },
                });
            }
        });
    } catch {
        // Gracefully ignore
    }

    // Sort by timestamp descending
    notifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    return {
        total: notifications.length,
        unread: unreadCount,
        notifications,
    };
}

// ─── API Functions ───────────────────────────────────────────────────────────
export const notificationsApi = {
    /**
     * Get all notifications with persistent read states
     */
    getAll: async (): Promise<NotificationSummary> => {
        try {
            // If backend has dedicated endpoint, try it
            const { data } = await axiosInstance.get('/notifications/');
            const readIds = getStoredReadIds();
            const dismissedIds = getStoredDismissedIds();

            if (data?.notifications && Array.isArray(data.notifications)) {
                const filtered = data.notifications
                    .filter((n: Notification) => !dismissedIds.has(String(n.id)))
                    .map((n: Notification) => ({
                        ...n,
                        is_read: n.is_read || readIds.has(String(n.id)),
                    }));
                return {
                    total: filtered.length,
                    unread: filtered.filter((n: Notification) => !n.is_read).length,
                    notifications: filtered,
                };
            }
            return data;
        } catch {
            // Fallback: smart aggregation engine
            return generateSmartNotifications();
        }
    },

    /**
     * Mark a single notification as read
     */
    markAsRead: async (id: string | number): Promise<void> => {
        saveStoredReadId(id);
        try {
            await axiosInstance.patch(`/notifications/${id}/`, { is_read: true });
        } catch {
            // Silently succeed via local storage
        }
    },

    /**
     * Mark all notifications as read
     */
    markAllAsRead: async (ids?: (string | number)[]): Promise<void> => {
        if (ids && ids.length > 0) {
            saveAllStoredReadIds(ids);
        }
        try {
            await axiosInstance.post('/notifications/mark-all-read/');
        } catch {
            // Silently succeed via local storage
        }
    },

    /**
     * Dismiss / hide a notification permanently
     */
    dismissNotification: async (id: string | number): Promise<void> => {
        saveStoredDismissedId(id);
        try {
            await axiosInstance.delete(`/notifications/${id}/`);
        } catch {
            // Silently succeed via local storage
        }
    },

    /**
     * Clear all read notifications
     */
    clearAllRead: async (readIds: (string | number)[]): Promise<void> => {
        readIds.forEach((id) => saveStoredDismissedId(id));
    },
};
