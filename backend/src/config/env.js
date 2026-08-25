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

  paymentGateway: process.env.PAYMENT_GATEWAY || 'mock',
  smsProvider: process.env.SMS_PROVIDER || 'none',
  whatsappProvider: process.env.WHATSAPP_PROVIDER || 'none',
};
