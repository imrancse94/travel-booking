/**
 * Snapshot of the process environment for the super-admin "Environment" page.
 *
 * Values are read from process.env (what the running app actually sees:
 * nextapp/.env locally, the Coolify/host variables in production). Anything
 * that looks like a credential is masked HERE, on the server, so a secret is
 * never serialised into the page sent to the browser -- even to a super admin.
 */

const GROUPS = [
  { title: 'Application', keys: ['NODE_ENV', 'IS_DEMO', 'PUBLIC_URL', 'INTERNAL_APP_URL', 'PORT', 'LOG_LEVEL'] },
  {
    title: 'Authentication',
    keys: ['JWT_SECRET', 'JWT_EXPIRES_IN', 'JWT_REFRESH_SECRET', 'JWT_REFRESH_EXPIRES_IN'],
  },
  {
    title: 'Email',
    keys: ['EMAIL_PROVIDER', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM'],
  },
  {
    title: 'Storage',
    keys: ['FILE_STORAGE_DRIVER', 'AWS_REGION', 'AWS_S3_BUCKET', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'],
  },
  { title: 'Bookings & notifications', keys: ['BOOKING_HOLD_MINUTES', 'SMS_PROVIDER', 'WHATSAPP_PROVIDER'] },
  {
    title: 'Payments & Stripe',
    keys: ['PAYMENT_GATEWAY', 'STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_API_VERSION'],
  },
  { title: 'PayPal', keys: ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'PAYPAL_BASE_URL'] },
  { title: 'bKash', keys: ['BKASH_APP_KEY', 'BKASH_APP_SECRET', 'BKASH_USERNAME', 'BKASH_PASSWORD', 'BKASH_BASE_URL'] },
  { title: 'Nagad', keys: ['NAGAD_MERCHANT_ID', 'NAGAD_MERCHANT_PRIVATE_KEY', 'NAGAD_PUBLIC_KEY', 'NAGAD_BASE_URL'] },
];

const SENSITIVE = /(SECRET|PASSWORD|PRIVATE|TOKEN|ACCESS_KEY_ID|APP_KEY|API_KEY|STRIPE_SECRET_KEY|CLIENT_ID)/i;

/** postgresql://user:pass@host/db -> postgresql://user:••••@host/db */
function maskUrlPassword(value) {
  return value.replace(/(\/\/[^:/@\s]+:)([^@\s]+)(@)/, '$1••••••$3');
}

function present(key, raw) {
  if (raw === undefined || raw === '') return { value: null, masked: false };
  if (SENSITIVE.test(key)) return { value: '••••••••', masked: true };
  if (/_URL$/.test(key) && /\/\/[^/@\s]+:[^@\s]+@/.test(raw)) return { value: maskUrlPassword(raw), masked: true };
  return { value: raw, masked: false };
}

export function getEnvironmentGroups() {
  return GROUPS.map((group) => ({
    title: group.title,
    entries: group.keys.map((key) => ({ key, ...present(key, process.env[key]) })),
  }));
}
