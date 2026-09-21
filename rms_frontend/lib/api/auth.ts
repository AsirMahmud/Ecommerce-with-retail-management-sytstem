import apiClient, { API_BASE_URL } from '../api-client';

export const API_URL = API_BASE_URL;

export type UserRole = 'admin' | 'manager' | 'cashier' | 'inventory' | 'accountant' | 'courier';

export interface UserProfile {
    id: number;
    username: string;
    email: string;
    first_name?: string;
    last_name?: string;
    role: UserRole;
    phone?: string;
    is_superuser: boolean;
}

export interface LoginCredentials {
    username: string;
    password: string;
}

export interface AuthResponse {
    access: string;
    refresh: string;
    user?: UserProfile;
}

export const authApi = {
    login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
        const { data } = await apiClient.post<AuthResponse>('/auth/login/', credentials);
        return data;
    },

    getMe: async (): Promise<UserProfile> => {
        const { data } = await apiClient.get<UserProfile>('/auth/me/');
        return data;
    },

    refreshToken: async (refresh: string): Promise<{ access: string; refresh?: string }> => {
        const { data } = await apiClient.post<{ access: string; refresh?: string }>('/auth/token/refresh/', { refresh });
        return data;
    },

    logout: async (): Promise<void> => {
        // Optional backend notification if blacklist view is wired
        try {
            await apiClient.post('/auth/logout/');
        } catch {
            // Ignore if endpoint is not implemented
        }
    }
};
 