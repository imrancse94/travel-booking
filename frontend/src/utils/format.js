// Shared formatting helpers used across admin pages/tables so currency and
// date rendering stays consistent (see instructions.md sections 60-61 --
// currency is never assumed to be USD; timestamps are stored and sent by the
// API as UTC and converted here to the agency's configured display timezone,
// never just whatever timezone the viewer's own browser happens to be in).
//
// The active timezone is a module-level value rather than a parameter every
// call site has to thread through: `BrandingContext` calls setDisplayTimezone
// once, from the same Settings > Timezone value the backend already serves
// (see lib/branding.js), and every formatDate/formatDateTime call anywhere in
// the app immediately picks it up.
let activeTimezone = 'UTC';

export function setDisplayTimezone(timezone) {
  if (timezone) activeTimezone = timezone;
}

export function formatCurrency(amount, currency = 'USD') {
  const value = Number(amount ?? 0);
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: activeTimezone,
  });
}

export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: activeTimezone,
  });
}

/** Time only, e.g. for a log entry's timestamp column -- same zone and AM/PM as formatDateTime. */
export function formatTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: activeTimezone,
  });
}

export function formatDateInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

export function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
