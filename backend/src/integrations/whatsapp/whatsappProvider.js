import logger from '../../config/logger.js';
import { env } from '../../config/env.js';

// Placeholder WhatsApp channel (e.g. Meta Cloud API / Twilio WhatsApp later).
export async function sendWhatsapp({ to, message }) {
  if (env.whatsappProvider === 'none') {
    logger.debug({ to }, '[whatsapp] provider not configured, skipping');
    return { skipped: true };
  }
  throw new Error(`WhatsApp provider "${env.whatsappProvider}" is not implemented yet`);
}
