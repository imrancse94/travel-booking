import { httpClient } from './httpClient.js';

// REST shape per instructions.md section 8 (Hotel Management). Every function
// resolves to the raw `{ success, data, message, meta? }` envelope -- callers
// read `.data` (and `.meta.pagination` for list()).
const BASE = '/hotels';

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

export function addImage(hotelId, payload) {
  return httpClient.post(`${BASE}/${hotelId}/images`, payload);
}

export function removeImage(hotelId, imageId) {
  return httpClient.delete(`${BASE}/${hotelId}/images/${imageId}`);
}

export function setAmenities(hotelId, amenityIds) {
  return httpClient.put(`${BASE}/${hotelId}/amenities`, { amenityIds });
}
