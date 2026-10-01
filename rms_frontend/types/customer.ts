export interface CustomerPurchaseItem {
    product_name: string;
    size: string;
    color: string;
    quantity: number;
    unit_price: string;
    total: string;
}

export interface CustomerPurchase {
    id: number;
    date: string;
    total_amount: string;
    status: string;
    payment_method: string;
    discount: string;
    amount_due: string;
    amount_paid: string;
    items: CustomerPurchaseItem[];
}

export interface Customer {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    address: string;
    gender: 'M' | 'F' | 'O';
    date_of_birth: string | null;
    created_at: string;
    updated_at: string;
    is_active: boolean;
    total_sales: number;
    sales_count: number;
    last_sale_date: string | null;
    purchase_history: CustomerPurchase[];
    ranking?: number;
    is_top_customer?: boolean;
    total_due_amount?: number;
    average_discount?: number;
    customer_type?: 'shop' | 'online' | 'both';
} 