import { httpClient } from './httpClient.js';

// REST shape per instructions.md section 20 (Extra Services). GET / and
// GET /:id are public (see backend/src/routes/services.routes.js) so the
// customer-facing checkout can list the catalog before the user signs in.
const BASE = '/services';

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
