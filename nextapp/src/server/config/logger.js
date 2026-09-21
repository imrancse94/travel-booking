import path from 'node:path';
import { Logger } from '../lib/Logger.js';
import { env } from './env.js';

const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'password',
  'passwordHash',
  'newPassword',
  'oldPassword',
  'token',
  'refreshToken',
  'accessToken',
  'cardNumber',
  'cvv',
  '*.password',
  '*.passwordHash',
];

const LOGS_DIR = path.join(process.cwd(), 'logs');

export function dateStamp(date = new Date()) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

export const logger = env.isTest
  ? new Logger({ level: 'silent' })
  : new Logger(
      {
        level: process.env.LOG_LEVEL || (env.isProduction ? 'info' : 'debug'),
        redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
        transport: env.isProduction ? undefined : { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } },
      },
      path.join(LOGS_DIR, `${dateStamp()}-app.log`)
    );

export default logger;
