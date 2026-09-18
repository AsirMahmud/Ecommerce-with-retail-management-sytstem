import axios from './axios-config';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';

export interface ReportDateRange {
    date_from: string;
    date_to: string;
}

export interface SalesReport {
    total_sales: string;
    gross_sales?: string;
    total_discounts?: string;
    total_tax?: string;
    total_refunds?: string;
    net_sales?: string;
    total_orders: number;
    total_items_sold: number;
    average_order_value: string;
    average_item_price: string;
    sales_by_date: Array<{
        date: string;
        total: string;
        items_count: number;
    }>;
    sales_by_category: Array<{
        category_name: string;
        total: string;
        items_count: number;
        quantity_sold: number;
    }>;
    sales_by_channel?: Array<{
        channel: string;
        raw_type: string;
        total: string;
        orders: number;
        items: number;
    }>;
    top_products: Array<{
        product_name: string;
        category_name: string;
        total_sales: string;
        quantity_sold: number;
        average_price: string;
        profit: string;
    }>;
    payment_methods: Array<{
        payment_method: string;
        total: string;
        orders_count: number;
        items_count?: number;
    }>;
}

export interface ExpenseReport {
    total_expenses: string;
    expenses_by_category: Array<{
        category_name: string;
        total: string;
        count: number;
    }>;
    expenses_by_date: Array<{
        date: string;
        total: string;
        count: number;
    }>;
}

export interface InventoryReport {
    total_products: number;
    total_stock_value: string;
    total_cost_value?: string;
    total_retail_value?: string;
    potential_profit?: string;
    unrealized_margin?: string | number;
    out_of_stock_count?: number;
    dead_stock_count?: number;
    dead_stock_value?: string;
    low_stock_items: Array<{
        name: string;
        stock: number;
        reorder_level: number;
        price: string;
    }>;
    stock_by_category: Array<{
        category_name: string;
        total_products: number;
        total_stock: number;
        total_value: string;
    }>;
    stock_movements: Array<{
        date: string;
        movement_type: string;
        total_quantity: number;
        total_value: string;
    }>;
}

export interface CustomerReport {
    total_customers: number;
    new_customers: number;
    total_sales: string;
    average_customer_value: string;
    total_orders?: number;
    completed_orders?: number;
    cancelled_orders?: number;
    cancellation_rate?: string | number;
    top_customers: Array<{
        first_name: string;
        last_name: string;
        phone: string;
        total_sales: string;
        items_purchased: number;
        unique_products: number;
        last_purchase_date: string;
        total_orders?: number;
        completed_orders?: number;
        cancelled_orders?: number;
        cancellation_rate?: string | number;
    }>;
    customer_acquisition: Array<{
        date: string;
        new_customers: number;
    }>;
}

export interface CategoryReport {
    total_categories: number;
    total_products: number;
    sales_by_category: Array<{
        category_name: string;
        total_sales: string;
        items_sold: number;
        unique_products: number;
    }>;
    stock_by_category: Array<{
        category_name: string;
        total_products: number;
        total_stock: number;
        total_value: string;
    }>;
    top_categories: Array<{
        name: string;
        total_sales: string;
        items_sold: number;
        product_count: number;
        average_price: string;
    }>;
}

export interface ProfitLossReport {
    total_revenue: string;
    gross_revenue?: string;
    total_discounts?: string;
    total_refunds?: string;
    net_revenue?: string;
    cogs?: string;
    gross_profit?: string;
    gross_margin?: string | number;
    total_expenses: string;
    net_profit: string;
    profit_margin: string;
    revenue_by_date: Array<{
        date: string;
        revenue: string;
        items_sold: number;
    }>;
    expenses_by_date: Array<{
        total: any;
        date: string;
        amount: string;
        count: number;
    }>;
    profit_by_category: Array<{
        category_name: string;
        revenue: string;
        cost: string;
        profit: string;
        items_sold: number;
    }>;
    revenue_vs_expense_by_date: Array<{
        date: string;
        revenue: string;
        expense: string;
    }>;
    expenses_over_time: Array<{
        date: string;
        amount: string;
    }>;
}

export interface ProductPerformanceReport {
    total_products: number;
    total_sales: string;
    total_profit: string;
    average_profit_margin: string;
    average_profit: string;
    average_selling_price_with_discount: string;
    top_performing_products: Array<{
        product_id: number;
        product_name: string;
        category_name: string;
        total_sales: string;
        quantity_sold: number;
        total_profit: string;
        profit_margin: string;
        average_price: string;
        average_profit: string;
        average_selling_price_with_discount: string;
    }>;
    low_performing_products: Array<{
        product_id: number;
        product_name: string;
        category_name: string;
        total_sales: string;
        quantity_sold: number;
        total_profit: string;
        profit_margin: string;
        average_price: string;
        average_profit: string;
        average_selling_price_with_discount: string;
    }>;
    sales_by_product: Array<{
        product_id: number;
        product_name: string;
        total_sales: string;
        quantity_sold: number;
        average_price: string;
        average_selling_price_with_discount: string;
    }>;
    profit_by_product: Array<{
        product_id: number;
        product_name: string;
        total_profit: string;
        profit_margin: string;
        quantity_sold: number;
        average_profit: string;
    }>;
}

export interface OverviewReport {
    total_sales: string;
    gross_sales?: string;
    total_discounts?: string;
    total_tax?: string;
    total_refunds?: string;
    net_sales?: string;
    cogs?: string;
    gross_profit?: string;
    total_orders: number;
    total_expenses: string;
    net_profit: string;
    profit_margin: string | number;
    sales_by_date: Array<{
        date: string;
        total: string;
    }>;
    expenses_by_date: Array<{
        date: string;
        total: string;
    }>;
    preorder_total_orders?: number;
    preorder_total_revenue?: string;
    preorder_profit?: string;
    preorder_status_breakdown?: Record<string, number>;
}

export interface OnlinePreorderAnalytics {
    total_orders: number;
    total_sales_count: number;
    cancelled_orders_count?: number;
    cancellation_rate?: string | number;
    total_revenue: string;
    total_profit: string;
    average_order_value: string;
    top_products: Array<{
        product_id: number;
        product_name: string;
        category_name: string;
        total_sales: string;
        quantity_sold: number;
        total_profit: string;
    }>;
    top_categories: Array<{
        category_name: string;
        total_sales: string;
        quantity_sold: number;
        total_profit: string;
        order_count: number;
    }>;
    sales_by_date: Array<{
        date: string;
        total: string;
        orders_count: number;
    }>;
    status_breakdown: Record<string, number>;
    cancel_reasons?: Array<{
        cancel_reason: string;
        count: number;
    }>;
    top_customers?: Array<{
        customer_name: string;
        customer_phone: string;
        customer_email: string;
        customer_address?: string | Record<string, any> | null;
        total_orders: number;
        completed_orders: number;
        cancelled_orders: number;
        pending_orders: number;
        cancellation_rate: string | number;
        total_spent: string;
        last_order_date?: string | null;
        last_order_id?: number;
    }>;
    customer_stats?: {
        total_unique_customers: number;
        repeat_customers: number;
        repeat_rate: string | number;
        cancelled_orders: number;
        cancellation_rate: string | number;
    };
}

export interface TaxReport {
    taxable_sales: string;
    total_tax_collected: string;
    tax_refunded: string;
    net_tax_payable: string;
    tax_by_date: Array<{
        date: string;
        taxable_amount: string;
        tax_collected: string;
    }>;
}

export interface ReturnsReport {
    total_returns_count: number;
    total_items_returned: number;
    total_refund_amount: string;
    return_rate_percentage: string | number;
    top_returned_products: Array<{
        product_id: number;
        product_name: string;
        category_name: string;
        returned_quantity: number;
        returns_count: number;
    }>;
    reasons_breakdown: Array<{
        reason: string;
        count: number;
        total_refund: string;
    }>;
    returns_by_date: Array<{
        date: string;
        count: number;
        refund_amount: string;
    }>;
}

export interface DuesAgingReport {
    total_receivable: string;
    current_due: string;
    due_1_to_30_days: string;
    due_31_to_60_days: string;
    due_60_plus_days: string;
    aging_customers: Array<{
        customer_id: number;
        customer_name: string;
        customer_phone: string;
        total_due: string | number;
        current: string | number;
        days_1_30: string | number;
        days_31_60: string | number;
        days_60_plus: string | number;
        invoices_count: number;
    }>;
}

export interface CashReconciliationReport {
    cash_sales: string;
    cash_refunds: string;
    cash_expenses: string;
    due_payments_collected: string;
    net_cash_in_drawer: string;
    non_cash_totals: Record<string, string>;
}

export const formatDateRange = (dateRange: DateRange | undefined): ReportDateRange | null => {
    if (!dateRange?.from || isNaN(dateRange.from.getTime())) return null;
    const toDate = dateRange.to && !isNaN(dateRange.to.getTime()) ? dateRange.to : dateRange.from;
    return {
        date_from: format(dateRange.from, 'yyyy-MM-dd'),
        date_to: format(toDate, 'yyyy-MM-dd'),
    };
};

export const reportsApi = {
    getSalesReport: async (dateRange: ReportDateRange): Promise<SalesReport> => {
        const response = await axios.get('/reports/sales/', { params: dateRange });
        return response.data;
    },

    getExpenseReport: async (dateRange: ReportDateRange): Promise<ExpenseReport> => {
        const response = await axios.get('/reports/expenses/', { params: dateRange });
        return response.data;
    },

    getInventoryReport: async (): Promise<InventoryReport> => {
        const response = await axios.get('/reports/inventory/');
        return response.data;
    },

    getCustomerReport: async (dateRange: ReportDateRange): Promise<CustomerReport> => {
        const response = await axios.get('/reports/customers/', { params: dateRange });
        return response.data;
    },

    getCategoryReport: async (): Promise<CategoryReport> => {
        const response = await axios.get('/reports/categories/');
        return response.data;
    },

    getProfitLossReport: async (dateRange: ReportDateRange): Promise<ProfitLossReport> => {
        const response = await axios.get('/reports/profit-loss/', { params: dateRange });
        return response.data;
    },

    getProductPerformanceReport: async (dateRange: ReportDateRange): Promise<ProductPerformanceReport> => {
        const response = await axios.get('/reports/product-performance/', { params: dateRange });
        return response.data;
    },

    getOverviewReport: async (dateRange: ReportDateRange): Promise<OverviewReport> => {
        const response = await axios.get('/reports/overview/', { params: dateRange });
        return response.data;
    },

    getOnlinePreorderAnalytics: async (dateRange: ReportDateRange): Promise<OnlinePreorderAnalytics> => {
        const response = await axios.get('/reports/online-preorder-analytics/', { params: dateRange });
        return response.data;
    },

    getTaxReport: async (dateRange: ReportDateRange): Promise<TaxReport> => {
        const response = await axios.get('/reports/tax/', { params: dateRange });
        return response.data;
    },

    getReturnsReport: async (dateRange: ReportDateRange): Promise<ReturnsReport> => {
        const response = await axios.get('/reports/returns/', { params: dateRange });
        return response.data;
    },

    getDuesAgingReport: async (): Promise<DuesAgingReport> => {
        const response = await axios.get('/reports/dues-aging/');
        return response.data;
    },

    getReconciliationReport: async (dateRange: ReportDateRange): Promise<CashReconciliationReport> => {
        const response = await axios.get('/reports/reconciliation/', { params: dateRange });
        return response.data;
    },

    exportReport: (type: string, dateRange?: ReportDateRange | null) => {
        const params = new URLSearchParams();
        params.append('type', type);
        if (dateRange) {
            params.append('date_from', dateRange.date_from);
            params.append('date_to', dateRange.date_to);
        }
        const baseURL = axios.defaults.baseURL || '/api';
        window.open(`${baseURL}/reports/export/?${params.toString()}`, '_blank');
    }
}; 