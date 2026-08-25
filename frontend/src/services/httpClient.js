import { ApiClient } from '../lib/ApiClient.js';
import { getAccessToken, clearAccessToken } from './tokenStore.js';

export const httpClient = new ApiClient({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1',
  getAccessToken,
  onUnauthorized: clearAccessToken,
});
