import 'dotenv/config';

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  port: Number(process.env.PORT || 4000),
  apiPrefix: process.env.API_PREFIX || '/api/v1',

  databaseUrl: required('DATABASE_URL', 'postgresql://booking_user:booking_password@localhost:5432/booking_db'),
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // Must exceed the number of bookings that can be in flight at once: the
  // double-booking guard holds a connection per transaction while it waits on
  // its advisory lock.
  databasePoolMax: Number(process.env.DATABASE_POOL_MAX || 25),

  jwt: {
    secret: required('JWT_SECRET', 'dev-secret'),
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: required('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    from: process.env.SMTP_FROM || 'Global Travel Agency <no-reply@example.com>',
  },
  emailProvider: process.env.EMAIL_PROVIDER || 'console',

  bookingHoldMinutes: Number(process.env.BOOKING_HOLD_MINUTES || 10),

  fileStorageDriver: process.env.FILE_STORAGE_DRIVER || 'local',

  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    s3Bucket: process.env.AWS_S3_BUCKET || '',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },

  // Which gateway paymentService charges when a request does not name one.
  // Every provider below defaults to its SANDBOX host, so a misconfigured
  // deployment fails against a test endpoint rather than a live one.
  paymentGateway: process.env.PAYMENT_GATEWAY || 'mock',

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    apiVersion: process.env.STRIPE_API_VERSION || '2024-06-20',
    // Sandbox only: lets the card flow be exercised end to end before Stripe
    // Elements is wired into the checkout form. Ignored once the browser sends
    // metadata.paymentMethodId.
    testPaymentMethod: process.env.STRIPE_TEST_PAYMENT_METHOD || 'pm_card_visa',
  },

  paypal: {
    clientId: process.env.PAYPAL_CLIENT_ID || '',
    clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
    baseUrl: process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com',
    returnUrl: process.env.PAYPAL_RETURN_URL || '',
    cancelUrl: process.env.PAYPAL_CANCEL_URL || '',
  },

  bkash: {
    appKey: process.env.BKASH_APP_KEY || '',
    appSecret: process.env.BKASH_APP_SECRET || '',
    username: process.env.BKASH_USERNAME || '',
    password: process.env.BKASH_PASSWORD || '',
    baseUrl: process.env.BKASH_BASE_URL || 'https://tokenized.sandbox.bka.sh/v1.2.0-beta',
    callbackUrl: process.env.BKASH_CALLBACK_URL || '',
  },

  nagad: {
    merchantId: process.env.NAGAD_MERCHANT_ID || '',
    merchantNumber: process.env.NAGAD_MERCHANT_NUMBER || '',
    merchantPrivateKey: process.env.NAGAD_MERCHANT_PRIVATE_KEY || '',
    nagadPublicKey: process.env.NAGAD_PUBLIC_KEY || '',
    baseUrl: process.env.NAGAD_BASE_URL || 'https://api.mynagad.com/remote-payment-gateway-1.0',
    apiVersion: process.env.NAGAD_API_VERSION || 'v-0.2.0',
    callbackUrl: process.env.NAGAD_CALLBACK_URL || '',
  },
  smsProvider: process.env.SMS_PROVIDER || 'none',
  whatsappProvider: process.env.WHATSAPP_PROVIDER || 'none',
};
