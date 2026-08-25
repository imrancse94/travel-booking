import { httpClient } from './httpClient.js';

// Matches backend/src/routes/bookings.routes.js exactly.
const BASE = '/bookings';

export function list(params) {
  return httpClient.get(BASE, { params });
}

export function getById(id) {
  return httpClient.get(`${BASE}/${id}`);
}

export function create(payload) {
  return httpClient.post(BASE, payload);
}

export function cancel(id, { reason } = {}) {
  return httpClient.post(`${BASE}/${id}/cancel`, { reason });
}

export function confirm(id) {
  return httpClient.post(`${BASE}/${id}/confirm`);
}

export function checkIn(id, { notes } = {}) {
  return httpClient.post(`${BASE}/${id}/check-in`, { notes });
}

export function checkOut(id, { notes } = {}) {
  return httpClient.post(`${BASE}/${id}/check-out`, { notes });
}
