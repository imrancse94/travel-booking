import { ValidationError } from '../utils/errors.js';

/**
 * Replaces Express's `validate({ body, query, params })` middleware. There,
 * a schema failure threw a single ValidationError covering every part at
 * once and the parsed values replaced `req.body`/`req.query`/`req.params` in
 * place. A Route Handler has no shared `req` to mutate -- params, the query
 * string, and the body are each read through a different API -- so this is
 * three focused functions instead of one, each returning the parsed value
 * rather than mutating anything.
 *
 * The `field` on a thrown error's `errors[]` keeps the exact
 * `body.<path>`/`query.<path>`/`params.<path>` shape the client's
 * `formErrors.js` (`apiFieldErrors`) already strips and humanizes -- nothing
 * about how the frontend shows validation errors needs to change.
 */
function issuesToFieldErrors(part, zodError) {
  return zodError.issues.map((issue) => ({ field: `${part}.${issue.path.join('.')}`, message: issue.message }));
}

function parse(part, value, schema) {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ValidationError('Validation failed', issuesToFieldErrors(part, result.error));
  }
  return result.data;
}

/** `ctx.params` from a dynamic route segment, e.g. `[id]/route.js`'s `{ params: { id } }`. */
export function parseParams(params, schema) {
  return parse('params', params, schema);
}

/** The request's query string, parsed the same way Express's `req.query` was. */
export function parseQuery(request, schema) {
  const query = Object.fromEntries(new URL(request.url).searchParams);
  return parse('query', query, schema);
}

/** The JSON body. Rejects a missing/malformed body the same way Express's body-parser did. */
export async function parseBody(request, schema) {
  let raw;
  try {
    raw = await request.json();
  } catch {
    throw new ValidationError('Validation failed', [{ field: 'body', message: 'Request body must be valid JSON' }]);
  }
  return parse('body', raw, schema);
}
