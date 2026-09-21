import { httpClient } from './httpClient.js';

// REST shape per instructions.md section 35 (Reports). `type` is one of:
// bookings | occupancy | revenue | customers | payments | refunds |
// commissions | hotels | tours | destinations. `params` carries the shared
// date-range + hotel/agent/payment-method/source filters (section 58).
const BASE = '/reports';

export function getReport(type, params) {
  return httpClient.get(`${BASE}/${type}`, { params });
}

/** Fetches a CSV export as a Blob for client-side download. */
export function exportCsv(type, params) {
  return httpClient.get(`${BASE}/${type}/export`, { params: { ...params, format: 'csv' }, responseType: 'blob' });
}
