/**
 * Maps Postgres driver errors onto HTTP responses.
 *
 * Prisma raised PrismaClientKnownRequestError with its own P-codes; the pg
 * driver raises the raw Postgres error, and Drizzle wraps that in a
 * DrizzleQueryError whose `cause` is the pg error. So unwrap first, then map
 * on SQLSTATE.
 */

// Postgres SQLSTATE class 08 (connection exception) and the pool's own
// acquisition timeout, which carries no SQLSTATE at all.
const CONNECTION_CLASS = '08';

/** Unwraps DrizzleQueryError to the underlying pg error, if there is one. */
export function unwrapDbError(err) {
  let current = err;
  // A failing transaction can nest one wrapper inside another.
  while (current?.cause && typeof current.code !== 'string') {
    current = current.cause;
  }
  return typeof current?.code === 'string' && current?.severity ? current : null;
}

/** `Key (email)=(a@b.c) already exists.` -> `email` */
function conflictingColumns(pgError) {
  const match = /^Key \((.+?)\)=/.exec(pgError.detail || '');
  if (match) return match[1];
  return pgError.constraint || 'value';
}

/**
 * Returns `{ statusCode, message }` for a Postgres error, or null when the
 * error did not come from the database.
 */
export function mapDbError(err, { isProduction } = {}) {
  const pgError = unwrapDbError(err);

  // The pg pool rejects an acquisition timeout as a plain Error. It has no
  // SQLSTATE, so match it before the code-based mapping.
  if (!pgError) {
    if (/timeout exceeded when trying to connect/i.test(err?.message || '')) {
      return { statusCode: 503, message: 'The database is busy, please retry' };
    }
    return null;
  }

  switch (pgError.code) {
    case '23505': // unique_violation
      return { statusCode: 409, message: `A record with this ${conflictingColumns(pgError)} already exists` };
    case '23503': // foreign_key_violation
      return { statusCode: 409, message: 'This action violates a related record constraint' };
    case '23502': // not_null_violation
      return { statusCode: 400, message: `${pgError.column || 'A required field'} is required` };
    case '23514': // check_violation
      return { statusCode: 400, message: 'A value is outside the range this field allows' };
    case '22P02': // invalid_text_representation, e.g. a malformed uuid
    case '22003': // numeric_value_out_of_range
      return { statusCode: 400, message: 'A value has the wrong type or is out of range' };
    case '40001': // serialization_failure
    case '40P01': // deadlock_detected
      return { statusCode: 409, message: 'The record changed while this request ran, please retry' };
    case '57014': // query_canceled (statement_timeout)
      return { statusCode: 503, message: 'The database took too long to respond' };
    case '53300': // too_many_connections
      return { statusCode: 503, message: 'The database is busy, please retry' };
    default:
      // The bare message hid the cause: a pool timeout and a constraint
      // violation both read as "Database request error". The SQLSTATE is
      // withheld in production but is what makes a CI failure diagnosable.
      return {
        statusCode: pgError.code?.startsWith(CONNECTION_CLASS) ? 503 : 400,
        message: isProduction ? 'Database request error' : `Database request error (${pgError.code})`,
      };
  }
}

/** True when the error is a Postgres error we translate into a client response. */
export function isDbError(err) {
  return mapDbError(err) !== null;
}
