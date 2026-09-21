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

/**
 * Exported (as well as used internally by parseParams/parseQuery/parseBody
 * below) so Server Actions -- which have no request/params/query to read
 * from, just plain arguments -- can validate against the same zod schemas
 * with the same ValidationError shape, via `parseArgs('body', payload, schema)`.
 */
export function parse(part, value, schema) {
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

/**
 * The JSON body. Rejects malformed JSON the same way Express's body-parser
 * did -- but a genuinely empty body (no request body at all, which a caller
 * with only optional fields, e.g. check-in/check-out/cancel's `notes`, can
 * legitimately send) parses as `{}` rather than throwing, matching
 * express.json()'s own handling of an empty request body.
 */
export async function parseBody(request, schema) {
  const text = await request.text();
  let raw;
  try {
    raw = text.trim() === '' ? {} : JSON.parse(text);
  } catch {
    throw new ValidationError('Validation failed', [{ field: 'body', message: 'Request body must be valid JSON' }]);
  }
  return parse('body', raw, schema);
}
