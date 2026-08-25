import { httpClient } from './httpClient.js';

// REST shape per instructions.md section 9 (Room Management). `list()`
// accepts an optional `roomTypeId` / `status` filter in params.
const BASE = '/rooms';

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

export function checkAvailability(params) {
  return httpClient.get(`${BASE}/availability`, { params });
}
