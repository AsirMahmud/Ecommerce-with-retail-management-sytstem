import axios from './axios-config';

export interface OnlinePreorderItem {
  product_id: number;
  product_name?: string;
  product_image?: string;
  size: string;
  color: string;
  quantity: number;
  unit_price: number;
  discount?: number;
}

export interface OnlinePreorder {
  id: number;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  items: OnlinePreorderItem[];
  shipping_address?: any;
  delivery_charge?: number | string;
  delivery_method?: string;
  total_amount: number | string;
  coupon_code?: string;
  coupon_interaction_mode?: string;
  original_subtotal?: number | string;
  automatic_discount_amount?: number | string;
  coupon_discount_amount?: number | string;
  final_merchandise_subtotal?: number | string;
  status: string;
  notes?: string;
  expected_delivery_date?: string;
  created_at: string;
  updated_at?: string;
}

export interface OnlinePreorderVerificationItem {
  id: number;
  sku: string;
  product_name: string;
  ordered_qty: number;
  verified_qty: number;
}

export interface OnlinePreorderVerification {
  id: number;
  online_preorder: number;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
  total_units: number;
  verified_units: number;
  skipped_reason?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  skipped_at?: string | null;
  items: OnlinePreorderVerificationItem[];
}

export interface OnlinePreorderScanResult {
  result: 'MATCHED' | 'NOT_IN_ORDER' | 'OVER_SCAN';
  message: string;
  verification: OnlinePreorderVerification;
}

const api = axios;

export const onlinePreordersApi = {
  getAll: (status?: string, search?: string) => {
    const params = new URLSearchParams();
    if (status && status !== 'all') params.append('status', status);
    if (search) params.append('search', search);
    const qs = params.toString();
    return api.get<{ results?: OnlinePreorder[] } | OnlinePreorder[]>(`/online-preorder/orders/${qs ? `?${qs}` : ''}`);
  },
  getById: (id: number) => api.get<OnlinePreorder>(`/online-preorder/orders/${id}/`),
  create: (data: Partial<OnlinePreorder>) => api.post<OnlinePreorder>('/online-preorder/orders/', data),
  update: (id: number, data: Partial<OnlinePreorder>) => api.patch<OnlinePreorder>(`/online-preorder/orders/${id}/`, data),
  updateStatus: (id: number, status: string) => api.patch(`/online-preorder/orders/${id}/`, { status }),
  delete: (id: number) => api.delete(`/online-preorder/orders/${id}/`),

  // Verification APIs
  startVerification: (id: number) =>
    api.post<OnlinePreorderVerification>(`/online-preorder/orders/${id}/start-verification/`),
  getVerification: (id: number) =>
    api.get<OnlinePreorderVerification>(`/online-preorder/orders/${id}/verification/`),
  verifyScan: (id: number, sku?: string, product_id?: number) =>
    api.post<OnlinePreorderScanResult>(`/online-preorder/orders/${id}/verify-scan/`, { sku, product_id }),
  completeVerification: (id: number) =>
    api.post<OnlinePreorderVerification>(`/online-preorder/orders/${id}/complete-verification/`),
  skipVerification: (id: number, reason?: string) =>
    api.post<OnlinePreorderVerification>(`/online-preorder/orders/${id}/skip-verification/`, { reason }),
};









