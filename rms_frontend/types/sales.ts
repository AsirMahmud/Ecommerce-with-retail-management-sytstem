export type PaymentMethod = 'cash' | 'card' | 'mobile_money' | 'credit' | 'mobile' | 'gift' | 'split';
export type SaleStatus = 'pending' | 'completed' | 'cancelled' | 'refunded' | 'partially_paid' | 'gifted';
export type SaleType = 'shop' | 'online_preorder' | 'offline_preorder';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type ReturnStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export interface SaleItem {
    id?: number;
    product_id: number;
    product?: {
        id: number;
        name: string;
        sku: string;
        cost_price: number;
    };
    size: string;
    color: string;
    quantity: number;
    unit_price: number;
    discount: number;
    total?: number;
    profit?: number;
    loss?: number;
    created_at?: string;
}

export interface SalePayment {
    id?: number;
    sale?: number;
    payment_method: PaymentMethod;
    amount: number;
    status: PaymentStatus;
    transaction_id?: string;
    is_gift_payment?: boolean;
    notes?: string;
    created_at?: string;
}

export interface DuePayment {
    id?: number;
    sale?: number;
    amount_due: number;
    amount_paid: number;
    due_date?: string;
    status: 'pending' | 'completed' | 'overdue';
    notes?: string;
    created_at?: string;
}

export interface Sale {
    id?: number;
    invoice_number?: string;
    customer?: (
        | number
        | null
        | {
            id: number;
            first_name: string;
            last_name: string;
            email?: string;
            phone?: string;
        }
    );
    customer_phone: string | null;
    date?: string;
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
    payment_method: PaymentMethod;
    status?: SaleStatus;
    sale_type?: SaleType;

    // New payment system fields
    amount_paid?: number;
    amount_due?: number;
    gift_amount?: number;
    is_fully_paid?: boolean;
    payment_status?: 'unpaid' | 'partially_paid' | 'fully_paid' | 'overpaid';

    total_profit?: number;
    total_loss?: number;
    notes?: string;
    created_at?: string;
    updated_at?: string;
    items: SaleItem[];

    // Payment data for split payments
    payment_data?: Array<{
        method: string;
        amount: string;
        notes?: string;
        transaction_id?: string;
    }>;

    // Related payment data
    sale_payments?: SalePayment[];
    due_payments?: DuePayment[];
    payments?: Payment[]; // Legacy payments
    returns?: Return[];
}

export interface Payment {
    id: number;
    sale: number;
    amount: number;
    payment_method: PaymentMethod;
    status: PaymentStatus;
    transaction_id: string;
    payment_date: string;
    notes: string;
    created_at: string;
}

export interface ReturnItem {
    id: number;
    return_order: number;
    sale_item: number | SaleItem;
    product_name?: string;
    sku?: string;
    size?: string;
    color?: string;
    unit_price?: number | string;
    quantity: number;
    reason: string;
    created_at: string;
}

export interface Return {
    id: number;
    return_number: string;
    sale: number;
    sale_id?: number;
    sale_details?: {
        id: number;
        invoice_number: string;
        customer_name: string;
        customer_phone: string;
        total: string | number;
        payment_method: string;
        date: string | null;
    } | null;
    reason: string;
    status: ReturnStatus;
    refund_amount: number;
    refund_method?: string;
    delivery_charge_paid_by_customer?: boolean;
    return_charge_amount?: number | string;
    notes?: string;
    processed_date: string | null;
    created_at: string;
    updated_at: string;
    items: ReturnItem[];
}

export interface CustomerLookupResponse {
    exists: boolean;
    customer?: {
        id: number;
        name: string;
        phone: string;
        email: string;
    };
    message?: string;
}

export interface DashboardStats {
    today: {
        total_sales: number;
        total_transactions: number;
        total_profit: number;
    };
    monthly: {
        total_sales: number;
        total_transactions: number;
        total_profit: number;
    };
    top_products: Array<{
        product__name: string;
        total_quantity: number;
        total_revenue: number;
        total_profit: number;
    }>;
    sales_trend: Array<{
        sale__date__date: any;
        date__date: string;
        sales: number;
        profit: number;
        orders: number;
    }>;
    sales_distribution: Array<{
        product__category__name: string;
        value: number;
        profit: number;
    }>;
}

export interface SalesSummary {
    total_transactions: number;
    gross_revenue: number;
    total_paid: number;
    total_due: number;
    total_profit: number;
    avg_ticket: number;
    in_store_count: number;
    preorder_count: number;
    due_count: number;
    pill_counts: {
        all: number;
        completed: number;
        due: number;
        in_store: number;
        preorders: number;
        refunded: number;
    };
}