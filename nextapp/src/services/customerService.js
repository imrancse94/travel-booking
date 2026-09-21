import { httpClient } from './httpClient.js';

// REST shape per instructions.md section 21 (Customer Management).
const BASE = '/customers';

// Self-service profile for the logged-in Customer user (authenticate only,
// no customers.* permission required -- distinct from the admin /customers/:id
// routes below, which a Customer-role caller cannot access).
export function getMe() {
  return httpClient.get(`${BASE}/me`);
}

export function updateMe(payload) {
  return httpClient.put(`${BASE}/me`, payload);
}

export function list(params) {
  return httpClient.get(BASE, { params });
}

export function getById(id) {
  return httpClient.get(`${BASE}/${id}`);
}

export function create(payload) {
  return httpClient.post(BASE, payload);
}

export function update(id, payload) {
  return httpClient.put(`${BASE}/${id}`, payload);
}

export function remove(id) {
  return httpClient.delete(`${BASE}/${id}`);
}

export function getBookingHistory(id, params) {
  return httpClient.get(`${BASE}/${id}/bookings`, { params });
}

export function getPaymentHistory(id, params) {
  return httpClient.get(`${BASE}/${id}/payments`, { params });
}
