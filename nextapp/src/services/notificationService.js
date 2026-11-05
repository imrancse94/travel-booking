import { httpClient } from './httpClient.js';

// REST shape per instructions.md section 29 (Notifications).
const BASE = '/notifications';

export function list(params) {
  return httpClient.get(BASE, { params });
}

// Matches backend/src/routes/notifications.routes.js: PATCH, not PUT/POST.
export function markRead(id) {
  return httpClient.patch(`${BASE}/${id}/read`);
}

export function markAllRead() {
  return httpClient.patch(`${BASE}/read-all`);
}
