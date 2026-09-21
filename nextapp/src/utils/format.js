// Shared formatting helpers used across admin pages/tables so currency and
// date rendering stays consistent (see instructions.md sections 60-61 --
// currency is never assumed to be USD; timestamps are stored and sent by the
// API as UTC and converted here to the agency's configured display timezone,
// never just whatever timezone the viewer's own browser happens to be in).
//
// The active timezone/currency are module-level values rather than a
// parameter every call site has to thread through: `BrandingContext` calls
// setDisplayTimezone/setDisplayCurrency once, from the same Settings >
// Timezone / Default Currency values the backend already serves (see
// lib/branding.js), and every formatDate/formatDateTime/formatCurrency call
// anywhere in the app immediately picks up the change -- including the many
// call sites (table column renderers especially) that call formatCurrency(x)
// with no currency argument at all and previously always got a hardcoded
// 'USD' symbol regardless of what was configured in Settings.
let activeTimezone = 'UTC';
let activeCurrency = 'USD';

export function setDisplayTimezone(timezone) {
  if (timezone) activeTimezone = timezone;
}

export function setDisplayCurrency(currency) {
  if (currency) activeCurrency = currency;
}

/**
 * Always renders as `<symbol><number>` (e.g. "$1,234.56"), regardless of
 * locale -- `Intl.NumberFormat`'s own `style: 'currency'` places the symbol
 * per locale convention, which for several common locales (e.g. de-DE, fr-FR)
 * puts it on the right or with a trailing space instead ("1.234,56 $"). The
 * symbol itself still comes from Intl (via `currencyDisplay: 'narrowSymbol'`,
 * e.g. "$" not "USD"), only its position is pinned.
 */
export function formatCurrency(amount, currency = activeCurrency) {
  const value = Number(amount ?? 0);
  try {
    const symbol = new Intl.NumberFormat(undefined, { style: 'currency', currency, currencyDisplay: 'narrowSymbol' })
      .formatToParts(0)
      .find((part) => part.type === 'currency')?.value;
    const number = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
    return `${symbol || currency}${number}`;
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

/**
 * Nullable DB columns (phone, description, floor, ...) come back from the API
 * as `null` when unset. Spreading that straight into a form's default object
 * (`{ ...EMPTY_FORM, ...res.data }`) overwrites EMPTY_FORM's '' fallback with
 * `null`, and a controlled <Input value={null}> is a React warning -- only a
 * string (or `undefined`, for an uncontrolled input) is valid. Call this on
 * the fetched record before merging it into form state.
 */
export function nullsToEmptyStrings(obj) {
  return Object.fromEntries(Object.entries(obj ?? {}).map(([key, value]) => [key, value ?? '']));
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
