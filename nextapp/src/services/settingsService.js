import { httpClient } from './httpClient.js';

// REST shape per instructions.md section 59 (Settings). Keys mirror
// backend/src/services/settingsService.js DEFAULTS: agency_name, currency,
// timezone, tax_rate_percent, default_commission_percent,
// cancellation_free_days, cancellation_partial_days,
// cancellation_partial_percent, cancellation_full_within_hours.
const BASE = '/settings';

export function getSettings() {
  return httpClient.get(BASE);
}

// The backend only accepts a single { key, value } update or a bulk
// { updates: [{ key, value }, ...] } array (setting.validators.js
// updateSettingSchema) -- not the flat { key: value, ... } object the admin
// Settings page edits in memory, so translate here before sending.
export function updateSettings(payload) {
  const updates = Object.entries(payload).map(([key, value]) => ({ key, value }));
  return httpClient.put(BASE, { updates });
}
