/**
 * Turns API and client-side validation failures into something a person can act on.
 *
 * The API answers a 422 with `{ message: 'Validation failed', errors: [{ field, message }] }`
 * where `field` is prefixed by the request part it came from (`body.email`,
 * `query.page`). ApiClient puts that array on `err.errors`, but every form was
 * showing only `err.message` -- so a user saw "Validation failed" with no
 * indication of which field, while the server had already said exactly.
 */

const REQUEST_PART = /^(body|query|params)\./;

/** camelCase / snake_case field name -> "First name". */
export function humanizeField(field) {
  const words = String(field)
    .replace(REQUEST_PART, '')
    .replace(/[_.]/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim();
  if (!words) return '';
  return words.charAt(0).toUpperCase() + words.slice(1).toLowerCase();
}

/**
 * Maps an API error's field issues onto form-state keys, so the offending
 * inputs can be highlighted rather than just described.
 */
export function apiFieldErrors(err) {
  const out = {};
  for (const issue of err?.errors || []) {
    const field = String(issue?.field || '').replace(REQUEST_PART, '');
    // First issue per field wins: that is the one closest to what the user typed.
    if (field && !out[field]) out[field] = issue.message;
  }
  return out;
}

/** "First name is required, Email is invalid" from a { field: message } map. */
export function describeFieldErrors(fieldErrors, max = 3) {
  const entries = Object.entries(fieldErrors || {});
  if (!entries.length) return '';
  const shown = entries.slice(0, max).map(([field, message]) => {
    // Messages that already name their subject read badly when prefixed again.
    const label = humanizeField(field);
    return message.toLowerCase().startsWith(label.toLowerCase()) ? message : `${label}: ${message}`;
  });
  const rest = entries.length - shown.length;
  return shown.join(', ') + (rest > 0 ? `, and ${rest} more` : '');
}

/**
 * The message to put in a toast for a failed request. Prefers the server's
 * per-field detail, falls back to its summary, then to a generic message --
 * so a 409 ("email already exists") or a 500 still says something useful.
 */
export function toastFromApiError(err, fallback = 'Something went wrong') {
  const fieldErrors = apiFieldErrors(err);
  const detail = describeFieldErrors(fieldErrors);
  if (detail) return `Please fix: ${detail}`;
  return err?.message || fallback;
}

/** The message for a client-side validation failure, before anything is sent. */
export function toastFromFieldErrors(fieldErrors) {
  const detail = describeFieldErrors(fieldErrors);
  return detail ? `Please fix: ${detail}` : 'Please correct the highlighted fields.';
}
