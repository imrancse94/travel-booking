import axios from 'axios';

// Thin wrapper around `axios`. Application code depends on this class, never
// on `axios` directly, so the HTTP client can be swapped or instrumented
// (retries, tracing, a different base client) from a single file.
export class ApiClient {
  constructor({ baseURL, getAccessToken, onUnauthorized } = {}) {
    this.getAccessToken = getAccessToken || (() => null);
    this.onUnauthorized = onUnauthorized || (() => {});
    this.isRefreshing = false;
    this.refreshPromise = null;

    this.instance = axios.create({
      baseURL,
      withCredentials: true,
      timeout: 20000,
    });

    this.instance.interceptors.request.use((config) => {
      const token = this.getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    this.instance.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          this.onUnauthorized();
        }
        return Promise.reject(this.normalizeError(error));
      }
    );
  }

  normalizeError(error) {
    const message = error.response?.data?.message || error.message || 'Something went wrong';
    const errors = error.response?.data?.errors || [];
    const statusCode = error.response?.status;
    return Object.assign(new Error(message), { errors, statusCode, isApiError: true });
  }

  get(url, config) {
    return this.instance.get(url, config).then((r) => r.data);
  }

  post(url, data, config) {
    return this.instance.post(url, data, config).then((r) => r.data);
  }

  put(url, data, config) {
    return this.instance.put(url, data, config).then((r) => r.data);
  }

  patch(url, data, config) {
    return this.instance.patch(url, data, config).then((r) => r.data);
  }

  delete(url, config) {
    return this.instance.delete(url, config).then((r) => r.data);
  }
}
