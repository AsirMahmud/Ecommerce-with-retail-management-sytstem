import apiClient, { API_BASE_URL } from '../api-client';

export const API_URL = API_BASE_URL;

// Re-export unified client
export const axiosInstance = apiClient;
export default apiClient;
 