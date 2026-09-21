import { httpClient } from './httpClient.js';

// REST shape per instructions.md section 9 (Room Management). `list()` accepts
// an optional `hotelId` filter in params.
const BASE = '/room-types';

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

export function setAmenities(roomTypeId, amenityIds) {
  return httpClient.put(`${BASE}/${roomTypeId}/amenities`, { amenityIds });
}
