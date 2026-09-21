import { httpClient } from './httpClient.js';

// REST shape per instructions.md section 22 (Travel Agency Module -> Destinations).
const BASE = '/destinations';

// `config` is forwarded to axios so callers can pass an AbortSignal; the
// destination typeahead uses it to drop superseded in-flight requests.
export function list(params, config) {
  return httpClient.get(BASE, { params, ...config });
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
