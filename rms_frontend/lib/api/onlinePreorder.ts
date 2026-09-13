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

  fbp?: string;
  fbc?: string;
  fbclid?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;

  event_id?: string;
  purchase_event_sent?: boolean;
  purchase_event_sent_at?: string;

  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  risk_score?: number;
  risk_level?: 'LOW' | 'MEDIUM' | 'HIGH';

  cancel_reason?: string;
  is_fake?: boolean;
  steadfast_consignment_id?: string;
  steadfast_status?: string;
  steadfast_tracking_code?: string;
  courier_partner?: string;
  courier_consignment_id?: string;
  courier_tracking_code?: string;
  courier_status?: string;
  courier_dispatched_at?: string;
  courier_response?: any;

  fraud_summary?: {
    risk_score: number;
    risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
    customer_stats: {
      total_orders: number;
      delivered_count: number;
      cancelled_count: number;
      returned_refused_count: number;
      recent_orders_24h: number;
      recent_orders_7d: number;
      previous_total_value: number;
      previous_delivered_value: number;
      last_order_date?: string | null;
    };
    matching_signals: string[];
    attribution: {
      fbp?: string;
      fbc?: string;
      fbclid?: string;
      utm_source?: string;
      utm_medium?: string;
      utm_campaign?: string;
      utm_content?: string;
      utm_term?: string;
    };
  };
}

export interface SteadfastFraudResult {
  success: boolean;
  phone: string;
  total_parcels: number;
  total_delivered: number;
  total_cancelled: number;
  success_rate: number;
  risk_level: 'SAFE' | 'NORMAL' | 'HIGH_RISK';
  data?: any;
  message?: string;
}

export interface SteadfastDispatchResult {
  success: boolean;
  message: string;
  consignment_id: string;
  tracking_code: string;
  status: string;
  order: OnlinePreorder;
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

  // Steadfast Courier APIs
  dispatchSteadfast: (
    id: number,
    data?: { cod_amount?: number; note?: string; address?: string; phone?: string }
  ) =>
    api.post<SteadfastDispatchResult>(
      `/online-preorder/orders/${id}/dispatch-steadfast/`,
      data || {}
    ),
  getSteadfastStatus: (id: number) =>
    api.get<{ success: boolean; status: string; data?: any; order: OnlinePreorder }>(
      `/online-preorder/orders/${id}/steadfast-status/`
    ),
  checkSteadfastFraud: (id?: number, phone?: string) => {
    if (id) {
      return api.get<SteadfastFraudResult>(`/online-preorder/orders/${id}/steadfast-fraud-check/`);
    }
    return api.get<SteadfastFraudResult>(
      `/online-preorder/orders/steadfast-fraud-check/?phone=${encodeURIComponent(phone || '')}`
    );
  },
  bulkDispatchSteadfast: (order_ids: number[]) =>
    api.post<{
      success: boolean;
      dispatched_count: number;
      failed_count: number;
      dispatched: any[];
      failed: any[];
    }>('/online-preorder/orders/bulk-dispatch-steadfast/', { order_ids }),
};










