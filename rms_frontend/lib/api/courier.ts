import axios from './axios-config';
import { OnlinePreorder } from './onlinePreorder';

export type CourierProvider = 'STEADFAST' | 'PATHAO' | 'REDX' | 'CARRYBEE';

export interface CourierSetting {
  id: number;
  provider: CourierProvider;
  is_active: boolean;
  is_default: boolean;
  api_key: string;
  secret_key?: string;
  base_url?: string;
  client_id?: string;
  client_secret?: string;
  username?: string;
  password?: string;
  store_id?: string;
  extra_config?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface ActiveCourier {
  provider: CourierProvider;
  name: string;
  is_default: boolean;
  tracking_url_template: string;
}

export interface CourierParcelSummary {
  total_booked: number;
  in_transit: number;
  in_transit_cod_amount?: number;
  delivered: number;
  delivered_cod_amount?: number;
  cancelled: number;
  cancelled_cod_amount?: number;
  total_cod_amount: number;
  today_picked_count?: number;
  today_picked_cod_amount?: number;
  today_delivered_count?: number;
  today_delivered_cod_amount?: number;
}

export interface CourierParcelsResponse {
  summary: CourierParcelSummary;
  provider_counts?: Record<string, number>;
  results: OnlinePreorder[];
}

export interface DispatchCourierPayload {
  courier_partner: CourierProvider | string;
  cod_amount?: number;
  note?: string;
  address?: string;
  phone?: string;
}

export interface DispatchCourierResult {
  success: boolean;
  message: string;
  consignment_id?: string;
  tracking_code?: string;
  status?: string;
  provider?: string;
  order?: OnlinePreorder;
}

export interface CourierFraudReport {
  phone?: string;
  name?: string;
  details?: string;
}

export interface CourierFraudResult {
  success: boolean;
  provider: CourierProvider | string;
  provider_name: string;
  phone: string;
  total_parcels: number;
  total_delivered: number;
  total_cancelled: number;
  success_rate: number;
  risk_level: 'SAFE' | 'NORMAL' | 'HIGH_RISK';
  rating?: number;
  rating_label?: string;
  trust_score?: number;
  recommendation?: string;
  is_new_customer?: boolean;
  fraud_reports?: CourierFraudReport[];
  provider_breakdown?: Record<string, { name: string; total: number; delivered: number; cancelled: number }>;
  network_data?: any;
  source?: string;
  message?: string;
}

export const courierApi = {
  // Courier Settings
  getSettings: () => axios.get<CourierSetting[]>('/online-preorder/courier-settings/'),
  
  updateSetting: (id: number, data: Partial<CourierSetting>) =>
    axios.patch<CourierSetting>(`/online-preorder/courier-settings/${id}/`, data),
  
  getActiveCouriers: () =>
    axios.get<ActiveCourier[]>('/online-preorder/courier-settings/active/'),
  
  testConnection: (id: number) =>
    axios.post<{ success: boolean; message: string }>(
      `/online-preorder/courier-settings/${id}/test-connection/`
    ),

  // Dispatch & Tracking
  dispatchOrder: (orderId: number, payload: DispatchCourierPayload) =>
    axios.post<DispatchCourierResult>(
      `/online-preorder/orders/${orderId}/dispatch-courier/`,
      payload
    ),

  getOrderStatus: (orderId: number) =>
    axios.get<{ success: boolean; message?: string; status?: string; order?: OnlinePreorder }>(
      `/online-preorder/orders/${orderId}/courier-status/`
    ),

  syncCourierStatuses: (orderIds?: number[]) =>
    axios.post<{
      success: boolean;
      synced_count: number;
      failed_count: number;
      synced: Array<{ id: number; provider: string; status: string }>;
      failed: Array<{ id: number; message: string }>;
    }>('/online-preorder/orders/sync-courier-status/', {
      order_ids: orderIds,
    }),

  getCourierParcels: (params?: { courier?: string; courier_partner?: string; status?: string; search?: string }) =>
    axios.get<CourierParcelsResponse>('/online-preorder/orders/courier-parcels/', {
      params,
    }),

  bulkDispatch: (orderIds: number[], provider?: CourierProvider | string) =>
    axios.post<{
      success: boolean;
      provider?: string;
      dispatched_count: number;
      failed_count: number;
      dispatched: any[];
      failed: any[];
    }>('/online-preorder/orders/bulk-dispatch-steadfast/', {
      order_ids: orderIds,
      provider: provider || 'STEADFAST',
    }),

  // Multi-Courier Fraud & Delivery History Check
  checkCourierFraud: (params: { orderId?: number; phone?: string; provider?: string }) => {
    const { orderId, phone, provider } = params;
    const q = provider ? `?provider=${encodeURIComponent(provider)}` : '';
    if (orderId) {
      return axios.get<CourierFraudResult>(`/online-preorder/orders/${orderId}/courier-fraud-check/${q}`);
    }
    const phoneParam = phone ? `phone=${encodeURIComponent(phone)}` : '';
    const provParam = provider ? `&provider=${encodeURIComponent(provider)}` : '';
    return axios.get<CourierFraudResult>(`/online-preorder/orders/courier-fraud-check/?${phoneParam}${provParam}`);
  },
};
