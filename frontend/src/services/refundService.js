import { httpClient } from './httpClient.js';

// REST shape per instructions.md section 26 (Payment System -> refund / partial refund).
const BASE = '/refunds';

export function list(params) {
  return httpClient.get(BASE, { params });
}

export function getById(id) {
  return httpClient.get(`${BASE}/${id}`);
}

export function create(payload) {
  // payload: { paymentId, amount, reason }
  return httpClient.post(BASE, payload);
}

export function update(id, payload) {
  return httpClient.put(`${BASE}/${id}`, payload);
}
