/**
 * Builds the same JSON envelope the old Express `utils/apiResponse.js` sent
 * (`{success, data, message, meta}`), but as a plain `{ body, statusCode }`
 * descriptor instead of writing to a `res` object -- `apiHandler.js` is what
 * turns this into a real `NextResponse`. Kept byte-for-byte compatible with
 * what the client's `ApiClient.js`/`services/*.js` already expect, so nothing
 * on the client needs to change.
 */
export function success({ data = null, message = 'OK', statusCode = 200, meta } = {}) {
  const body = { success: true, data, message };
  if (meta) body.meta = meta;
  return { body, statusCode };
}

export function created(data, message = 'Created successfully') {
  return success({ data, message, statusCode: 201 });
}

export function paginated({ items, page, limit, total, message = 'OK' }) {
  return success({
    data: items,
    message,
    meta: {
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    },
  });
}
