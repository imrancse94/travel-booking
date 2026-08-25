import { httpClient } from './httpClient.js';

// REST shape per instructions.md section 25 (Transport Management).
const BASE = '/transport';

export function listVehicles(params) {
  return httpClient.get(`${BASE}/vehicles`, { params });
}

export function getVehicle(id) {
  return httpClient.get(`${BASE}/vehicles/${id}`);
}

export function createVehicle(payload) {
  return httpClient.post(`${BASE}/vehicles`, payload);
}

export function updateVehicle(id, payload) {
  return httpClient.put(`${BASE}/vehicles/${id}`, payload);
}

export function removeVehicle(id) {
  return httpClient.delete(`${BASE}/vehicles/${id}`);
}

export function listDrivers(params) {
  return httpClient.get(`${BASE}/drivers`, { params });
}

export function getDriver(id) {
  return httpClient.get(`${BASE}/drivers/${id}`);
}

export function createDriver(payload) {
  return httpClient.post(`${BASE}/drivers`, payload);
}

export function updateDriver(id, payload) {
  return httpClient.put(`${BASE}/drivers/${id}`, payload);
}

export function removeDriver(id) {
  return httpClient.delete(`${BASE}/drivers/${id}`);
}

export function listBookings(params) {
  return httpClient.get(`${BASE}/bookings`, { params });
}

export function getBooking(id) {
  return httpClient.get(`${BASE}/bookings/${id}`);
}

export function createBooking(payload) {
  return httpClient.post(`${BASE}/bookings`, payload);
}

export function updateBooking(id, payload) {
  return httpClient.put(`${BASE}/bookings/${id}`, payload);
}

export function removeBooking(id) {
  return httpClient.delete(`${BASE}/bookings/${id}`);
}
