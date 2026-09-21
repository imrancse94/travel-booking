import { httpClient } from './httpClient.js';

// REST shape per instructions.md section 28 (Commission). `list()` accepts
// `agentId` / `status` filters in params.
const BASE = '/commissions';

export function list(params) {
  return httpClient.get(BASE, { params });
}

export function getById(id) {
  return httpClient.get(`${BASE}/${id}`);
}

export function update(id, payload) {
  return httpClient.put(`${BASE}/${id}`, payload);
}

export function markAsPaid(id) {
  return httpClient.put(`${BASE}/${id}`, { status: 'paid', paidAt: new Date().toISOString() });
}
