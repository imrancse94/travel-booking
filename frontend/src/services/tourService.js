import { httpClient } from './httpClient.js';

// REST shape per instructions.md sections 22-24 (Travel Agency Module / Tour
// Itinerary / Tour Booking). Tour packages live at /tours; itineraries are
// nested under a package; tour bookings are a sibling collection at
// /tours/bookings (kept distinct from hotel bookings at /bookings).
const BASE = '/tours';

export function listPackages(params) {
  return httpClient.get(BASE, { params });
}

export function getPackage(id) {
  return httpClient.get(`${BASE}/${id}`);
}

export function createPackage(payload) {
  return httpClient.post(BASE, payload);
}

export function updatePackage(id, payload) {
  return httpClient.put(`${BASE}/${id}`, payload);
}

export function removePackage(id) {
  return httpClient.delete(`${BASE}/${id}`);
}

// Itinerary days: [{ dayNumber, title, description, activities, meals, accommodation, transportation }]
export function listItineraries(tourPackageId) {
  return httpClient.get(`${BASE}/${tourPackageId}/itineraries`);
}

export function saveItineraries(tourPackageId, days) {
  return httpClient.put(`${BASE}/${tourPackageId}/itineraries`, { days });
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
