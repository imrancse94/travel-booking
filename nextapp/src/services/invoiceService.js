import { httpClient } from './httpClient.js';

// REST shape per instructions.md section 27 (Invoice).
const BASE = '/invoices';

export function list(params) {
  return httpClient.get(BASE, { params });
}

export function getById(id) {
  return httpClient.get(`${BASE}/${id}`);
}

export function create(payload) {
  return httpClient.post(BASE, payload);
}

/** Fetches the invoice PDF as a Blob for client-side download (auth header required, so plain <a href> can't be used). */
export function downloadPdf(id) {
  return httpClient.get(`${BASE}/${id}/pdf`, { responseType: 'blob' });
}
