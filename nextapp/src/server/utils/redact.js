// Strips secrets out of anything on its way into a log file.
//
// pino's own `redact` option is path-based, which only covers the shapes you
// thought of in advance: it catches `body.password` but not
// `body.guests[3].passportNumber` or `body.payment.card.number`. Activity logs
// carry whole request bodies, so this walks the structure instead and decides
// per key, at any depth.
//
// Two independent defences:
//   1. the key looks sensitive  -> value replaced outright
//   2. the value looks like a card number -> masked even under an innocuous key,
//      because a PAN pasted into `specialRequests` is still cardholder data

export const REDACTED = '[REDACTED]';

/** Substring match, so `newPassword`, `password_hash` and `cardCvv` all hit. */
const SENSITIVE_KEY_PATTERNS = [
  'password',
  'passwd',
  'secret',
  'token',
  'authorization',
  'cookie',
  'apikey',
  'api_key',
  'privatekey',
  'private_key',
  // payment instrument data -- never belongs in a log, PCI or not
  'cardnumber',
  'card_number',
  'cardno',
  'pan',
  'cvv',
  'cvc',
  'securitycode',
  'security_code',
  'cardholder',
  'expirymonth',
  'expiryyear',
  'expiry_month',
  'expiry_year',
];

function isSensitiveKey(key) {
  const k = String(key).toLowerCase().replace(/[-\s]/g, '');
  return SENSITIVE_KEY_PATTERNS.some((p) => k.includes(p.replace(/[-_]/g, '')));
}

/** Luhn check, so ordinary 16-digit numbers (ids, phone strings) survive. */
function passesLuhn(digits) {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let d = digits.charCodeAt(i) - 48;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

/** Masks anything that reads as a card number, keeping the last 4 for support. */
export function maskCardNumbers(value) {
  return String(value).replace(/\b(?:\d[ -]*?){13,19}\b/g, (match) => {
    const digits = match.replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 19 || !passesLuhn(digits)) return match;
    return `**** **** **** ${digits.slice(-4)}`;
  });
}

/**
 * Returns a copy of `value` safe to write to a log.
 *
 * `maxDepth` and `maxArray` stop a hostile or accidental payload from turning
 * one log line into megabytes.
 */
export function redact(value, { maxDepth = 6, maxArray = 50 } = {}) {
  return walk(value, 0);

  function walk(node, depth) {
    if (node == null) return node;
    if (depth > maxDepth) return '[TRUNCATED]';

    if (typeof node === 'string') return maskCardNumbers(node);
    if (typeof node !== 'object') return node;
    if (node instanceof Date) return node.toISOString();
    if (Buffer.isBuffer(node)) return `[Buffer ${node.length}b]`;

    if (Array.isArray(node)) {
      const trimmed = node.slice(0, maxArray).map((item) => walk(item, depth + 1));
      if (node.length > maxArray) trimmed.push(`[+${node.length - maxArray} more]`);
      return trimmed;
    }

    const out = {};
    for (const [key, child] of Object.entries(node)) {
      out[key] = isSensitiveKey(key) ? REDACTED : walk(child, depth + 1);
    }
    return out;
  }
}

export default redact;
