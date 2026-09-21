/**
 * Drops keys whose value is `''`, `null` or `undefined` from a query-params
 * object.
 *
 * Unselected filter controls hold an empty string ("All statuses", "All
 * hotels", an untouched date input). The API validates query strings with zod,
 * so `?status=` or `?hotelId=` is a 422 rather than "no filter" — sending them
 * turns a perfectly good list or report into an error/empty state. Everything
 * goes through ApiClient, which applies this to every request's params.
 */
export function compactParams(params) {
  if (!params || typeof params !== 'object' || Array.isArray(params)) return params;

  const compacted = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value === '' || value === null || value === undefined) return;
    compacted[key] = value;
  });
  return compacted;
}

export default compactParams;
