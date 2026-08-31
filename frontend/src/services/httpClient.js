import { ApiClient } from '../lib/ApiClient.js';
import { getAccessToken, clearAccessToken } from './tokenStore.js';

export const httpClient = new ApiClient({
  // Next inlines NEXT_PUBLIC_* at build time, so this is fixed when the image
  // is built, not when the container starts. The default is relative on
  // purpose: next.config.js rewrites /api/* to the backend, which keeps the
  // browser same-origin and avoids a CORS preflight in production.
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api/v1',
  getAccessToken,
  onUnauthorized: clearAccessToken,
});
