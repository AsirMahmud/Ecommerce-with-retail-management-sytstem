export interface OnlinePreorderStatusBreakdown {
    PENDING: number;
    CONFIRMED: number;
    DELIVERED: number;
    COMPLETED: number;
    CANCELLED: number;
    HOLD?: number;
    RETURNED?: number;
    [key: string]: number | undefined;
}

export interface PeriodInfo {
    key: string;
    label: string;
    start_date: string;
    end_date: string;
}

export interface PopComparison {
    period_label: string;
    sales_growth: number;
    profit_growth: number;
    expenses_growth: number;
    orders_growth: number;
    aov_growth: number;
    current_sales: number;
    current_profit: number;
    current_expenses: number;
    current_net_profit: number;
    current_orders: number;
    current_aov: number;
    prior_sales: number;
    prior_profit: number;
    prior_expenses: number;
    prior_orders: number;
    prior_aov: number;
    return_count: number;
    refund_amount: number;
    return_rate: number;
}

export interface ChannelBreakdownItem {
    channel: string;
    name: string;
    revenue: number;
    orders: number;
    profit: number;
    percentage: number;
    aov: number;
}

export interface PaymentMethodItem {
    method: string;
    name: string;
    total: number;
    count: number;
    percentage: number;
}

export interface HourlySalesItem {
    hour: number;
    label: string;
    total: number;
    orders: number;
}

export interface DeadStockSample {
    name: string;
    stock: number;
    cost_value: number;
    selling_price: number;
}

export interface InventoryHealth {
    total_stock_units: number;
    total_retail_value: number;
    total_cost_value: number;
    potential_profit: number;
    healthy_count: number;
    low_stock_count: number;
    out_of_stock_count: number;
    dead_stock_count: number;
    dead_stock_capital: number;
    dead_stock_samples: DeadStockSample[];
}

export interface CourierMarketingSource {
    source: string;
    orders: number;
    revenue: number;
}

export interface CourierPerformance {
    period_orders: number;
    period_amount: number;
    status_breakdown: OnlinePreorderStatusBreakdown;
    completed_count: number;
    returned_count: number;
    in_transit_count: number;
    success_rate: number;
    return_rate: number;
    marketing_sources: CourierMarketingSource[];
}

export interface VipSpender {
    id: number;
    name: string;
    phone: string;
    total_spent: number;
    orders_count: number;
}

export interface CustomerInsights {
    new_customers: number;
    top_spenders: VipSpender[];
}

export interface DashboardStats {
    // Advanced Analytics
    period?: PeriodInfo;
    pop_comparison?: PopComparison;
    channel_breakdown?: ChannelBreakdownItem[];
    payment_methods?: PaymentMethodItem[];
    hourly_sales?: HourlySalesItem[];
    inventory_health?: InventoryHealth;
    courier_performance?: CourierPerformance;
    customer_insights?: CustomerInsights;

    // Existing / Compatible Core
    today: {
        sales: number;
        expenses: number;
        profit: number;
        online_preorders_count?: number;
        online_preorders_amount?: number;
    };
    monthly: {
        sales: number;
        expenses: number;
        profit: number;
    };
    counts: {
        customers: number;
        products: number;
        suppliers: number;
        online_preorders?: number;
    };
    online_preorders?: {
        today_count: number;
        today_amount: number;
        total_count: number;
        total_amount: number;
        today_status_breakdown: OnlinePreorderStatusBreakdown;
        status_breakdown: OnlinePreorderStatusBreakdown;
    };
    sales_trend: Array<{
        date__date: string;
        total: number;
        profit?: number;
        loss?: number;
    }>;
    expense_trend: Array<{
        date: string;
        amount: number;
    }>;
    top_products: Array<{
        name: string;
        total_sales: number;
        total_revenue?: number;
        total_profit?: number;
    }>;
    expense_categories: Array<{
        name: string;
        amount: number;
    }>;
    low_stock_items: Array<{
        name: string;
        stock_quantity: number;
        minimum_stock: number;
    }>;
    recent_suppliers: Array<{
        name: string;
        phone: string;
        email: string;
        address: string;
    }>;
}