import { httpClient } from './httpClient.js';

// Matches backend/src/routes/activityLogs.routes.js. Read-only: the logs are
// files on the server, gated behind activity_logs.view (Super Admin by default).
const BASE = '/activity-logs';

export function list(params) {
  return httpClient.get(BASE, { params });
}

export function listDates() {
  return httpClient.get(`${BASE}/dates`);
}
