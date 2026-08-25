import logger from '../../config/logger.js';
import { env } from '../../config/env.js';

// No SMS provider is wired up yet -- this keeps the notification service's
// channel dispatch uniform and makes it a one-file change to plug in Twilio,
// Vonage, or a local Bangladesh SMS gateway later.
export async function sendSms({ to, message }) {
  if (env.smsProvider === 'none') {
    logger.debug({ to }, '[sms] provider not configured, skipping');
    return { skipped: true };
  }
  throw new Error(`SMS provider "${env.smsProvider}" is not implemented yet`);
}
