import { httpClient } from './httpClient.js';

// REST shape per instructions.md section 11 (Hotel Pricing). Rate *plans*
// (Room Only / Breakfast Included / ...) live at /rate-plans; the dated price
// rows per room type (RoomRate) are nested under /rate-plans/room-rates.
const BASE = '/rate-plans';

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

// Room rates: { roomTypeId, ratePlanId, startDate, endDate, price, extraAdultPrice, extraChildPrice, currency }
export function listRoomRates(params) {
  return httpClient.get(`${BASE}/room-rates`, { params });
}

export function createRoomRate(payload) {
  return httpClient.post(`${BASE}/room-rates`, payload);
}

export function updateRoomRate(id, payload) {
  return httpClient.put(`${BASE}/room-rates/${id}`, payload);
}

export function removeRoomRate(id) {
  return httpClient.delete(`${BASE}/room-rates/${id}`);
}
