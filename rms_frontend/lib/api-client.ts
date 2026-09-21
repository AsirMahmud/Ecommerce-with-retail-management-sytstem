import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';

export const API_BASE_URL = process.env.NEXT_PUBLIC_BASEURL || 'http://localhost:8000/api';

// Create unified Axios client
export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Refresh token queue state
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else if (token) {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// Request Interceptor: Attach Bearer token from secure cookie
apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        if (typeof window !== 'undefined') {
            const token = Cookies.get('token');
            if (token && !config.headers.Authorization) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 with silent token refresh queue
apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (!error.response || !originalRequest) {
            return Promise.reject(error);
        }

        const status = error.response.status;
        const requestUrl = originalRequest.url || '';

        // Avoid infinite refresh loops for auth endpoints
        const isAuthEndpoint =
            requestUrl.includes('/auth/login') ||
            requestUrl.includes('/auth/token/refresh') ||
            requestUrl.includes('/auth/register');

        if (status === 401 && !originalRequest._retry && !isAuthEndpoint) {
            if (isRefreshing) {
                // Queue the request until the active refresh finishes
                return new Promise((resolve, reject) => {
                    failedQueue.push({
                        resolve: (newToken: string) => {
                            originalRequest.headers.Authorization = `Bearer ${newToken}`;
                            resolve(apiClient(originalRequest));
                        },
                        reject: (err) => reject(err),
                    });
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const refreshToken = Cookies.get('refreshToken');

            if (!refreshToken) {
                isRefreshing = false;
                handleAuthLogout();
                return Promise.reject(error);
            }

            try {
                // Attempt to refresh the access token
                const refreshResponse = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
                    refresh: refreshToken,
                });

                const newAccessToken = refreshResponse.data.access;

                // Save new access token (standard 1 day expiry)
                Cookies.set('token', newAccessToken, {
                    expires: 1,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict',
                });

                // If backend rotated refresh token, update it as well
                if (refreshResponse.data.refresh) {
                    Cookies.set('refreshToken', refreshResponse.data.refresh, {
                        expires: 7,
                        secure: process.env.NODE_ENV === 'production',
                        sameSite: 'strict',
                    });
                }

                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                processQueue(null, newAccessToken);
                isRefreshing = false;

                return apiClient(originalRequest);
            } catch (refreshErr) {
                processQueue(refreshErr, null);
                isRefreshing = false;
                handleAuthLogout();
                return Promise.reject(refreshErr);
            }
        }

        return Promise.reject(error);
    }
);

// Clear session and redirect on unrecoverable authentication failures
export function handleAuthLogout() {
    if (typeof window !== 'undefined') {
        Cookies.remove('token');
        Cookies.remove('refreshToken');
        delete apiClient.defaults.headers.common['Authorization'];

        const currentPath = window.location.pathname;
        if (!currentPath.startsWith('/login')) {
            window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
        }
    }
}

// Error normalization helper to extract human-readable feedback from DRF errors
export function normalizeApiError(error: any): string {
    if (typeof error === 'string') return error;
    if (!error) return 'An unexpected error occurred.';

    if (error.response?.data) {
        const data = error.response.data;

        // Simple string detail
        if (typeof data.detail === 'string') return data.detail;
        if (typeof data.message === 'string') return data.message;
        if (typeof data.error === 'string') return data.error;

        // DRF non_field_errors
        if (Array.isArray(data.non_field_errors) && data.non_field_errors.length > 0) {
            return String(data.non_field_errors[0]);
        }

        // DRF field-specific validation errors: { field: ["Error message"] }
        if (typeof data === 'object' && !Array.isArray(data)) {
            const firstKey = Object.keys(data)[0];
            if (firstKey) {
                const val = data[firstKey];
                if (Array.isArray(val) && val.length > 0) {
                    return `${firstKey.replace(/_/g, ' ')}: ${val[0]}`;
                }
                if (typeof val === 'string') {
                    return `${firstKey.replace(/_/g, ' ')}: ${val}`;
                }
            }
        }
    }

    return error.message || 'Request failed. Please check your network connection.';
}

export default apiClient;
