import axiosInstance from "./axios-config";

export interface PurchaseHistoryItem {
    name: string;
    size: string;
    price: string;
    quantity: number;
}

export interface PurchaseHistory {
    id: number;
    date: string;
    total_amount: string;
    status: string;
    payment_method: string;
    sales_person: string;
    items: PurchaseHistoryItem[];
}

export interface Customer {
    id: number;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string;
    address: string | null;
    gender: string | null;
    date_of_birth: string | null;
    created_at: string;
    updated_at: string;
    is_active: boolean;
    total_sales: number;
    sales_count: number;
    last_sale_date: string | null;
    purchase_history: PurchaseHistory[];
    ranking?: number;
    is_top_customer?: boolean;
    customer_type?: 'shop' | 'online' | 'both';
}

export interface TopCustomer {
    id: number;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string;
    total_sales: number;
    sales_count: number;
    average_order_value: number;
    last_purchase_date: string | null;
    ranking: number;
}

export interface CustomerAnalytics {
    total_customers: number;
    active_customers: number;
    inactive_customers: number;
    total_sales: number;
    total_orders: number;
    average_order_value: number;
    top_customers: TopCustomer[];
}

export interface CreateCustomerData {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone: string;
    address?: string;
    gender?: string;
    date_of_birth?: string;
}

export interface UpdateCustomerData extends Partial<CreateCustomerData> { }

export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

// Get all customers with pagination
export const getCustomers = async (page: number = 1, pageSize: number = 20): Promise<PaginatedResponse<Customer>> => {
    const response = await axiosInstance.get('/customer/customers/', {
        params: { page, page_size: pageSize }
    });
    return response.data;
};

// Get active customers with pagination
export const getActiveCustomers = async (page: number = 1, pageSize: number = 20): Promise<PaginatedResponse<Customer>> => {
    const response = await axiosInstance.get('/customer/customers/active_customers/', {
        params: { page, page_size: pageSize }
    });
    return response.data;
};

// Get top customers
export const getTopCustomers = async (): Promise<TopCustomer[]> => {
    const response = await axiosInstance.get('/customer/customers/top_customers/');
    return response.data;
};

// Get customer analytics
export const getCustomerAnalytics = async (): Promise<CustomerAnalytics> => {
    const response = await axiosInstance.get('/customer/customers/customer_analytics/');
    return response.data;
};

// Get customer by ID
export const getCustomer = async (id: number): Promise<Customer> => {
    const response = await axiosInstance.get(`/customer/customers/${id}/`);
    return response.data;
};

// Create new customer
export const createCustomer = async (data: CreateCustomerData): Promise<Customer> => {
    const response = await axiosInstance.post('/customer/customers/', data);
    return response.data;
};

// Update customer
export const updateCustomer = async (id: number, data: UpdateCustomerData): Promise<Customer> => {
    const response = await axiosInstance.patch(`/customer/customers/${id}/`, data);
    return response.data;
};

// Delete customer (soft delete)
export const deleteCustomer = async (id: number): Promise<void> => {
    await axiosInstance.delete(`/customer/customers/${id}/`);
};

// Search customers with pagination
export const searchCustomers = async (query: string, page: number = 1, pageSize: number = 20): Promise<PaginatedResponse<Customer>> => {
    const response = await axiosInstance.get('/customer/customers/', {
        params: { search: query, page, page_size: pageSize }
    });
    return response.data;
};

// Lookup customer by phone
export const lookupCustomerByPhone = async (phone: string): Promise<Customer | null> => {
    try {
        const response = await axiosInstance.get('/customer/customers/', {
            params: { search: phone }
        });
        const customers = response.data.results || response.data;
        return customers.find((customer: Customer) => customer.phone === phone) || null;
    } catch (error) {
        console.error('Error looking up customer:', error);
        return null;
    }
};

// Delete all customers
export const deleteAllCustomers = async (): Promise<void> => {
    await axiosInstance.delete('/settings/flush-database/?database_type=customers')
};

export interface ImportCSVResponse {
    success: boolean;
    message: string;
    created_count: number;
    updated_count: number;
    skipped_count: number;
    total_rows: number;
    errors?: string[];
}

// Import customers from CSV file or rows
export const importCustomersCSV = async (
    fileOrData: File | { csv_text?: string; rows?: any[][]; customer_type?: string },
    customerType: 'shop' | 'online' | 'both' = 'shop'
): Promise<ImportCSVResponse> => {
    if (fileOrData instanceof File) {
        const formData = new FormData();
        formData.append('file', fileOrData);
        formData.append('customer_type', customerType);
        const response = await axiosInstance.post('/customer/customers/import_csv/', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            }
        });
        return response.data;
    } else {
        const response = await axiosInstance.post('/customer/customers/import_csv/', {
            ...fileOrData,
            customer_type: customerType,
        });
        return response.data;
    }
};

// Download template from backend or fallback to client generator
export const downloadCustomerCSVTemplate = async (): Promise<Blob> => {
    const response = await axiosInstance.get('/customer/customers/download_template/', {
        responseType: 'blob'
    });
    return response.data;
};