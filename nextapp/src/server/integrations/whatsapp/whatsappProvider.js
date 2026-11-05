import logger from '../../config/logger.js';
import { env } from '../../config/env.js';

// WhatsApp channel abstraction (instructions.md section 29), same shape as the
// SMS provider: swap in the Meta Cloud API or Twilio WhatsApp here without
// touching the notification service.
//
//   WHATSAPP_PROVIDER=none     -> channel disabled, calls are skipped (default)
//   WHATSAPP_PROVIDER=console  -> development provider: logs the message

function createConsoleWhatsappProvider() {
  return {
    name: 'console',
    async send({ to, message }) {
      logger.info({ to, preview: String(message || '').slice(0, 160) }, '[whatsapp:console] would send message');
      return { provider: 'console', to, sent: true };
    },
  };
}

function createDisabledWhatsappProvider() {
  return {
    name: 'none',
    async send({ to }) {
      logger.debug({ to }, '[whatsapp] provider not configured, skipping');
      return { provider: 'none', skipped: true };
    },
  };
}

function resolveProvider() {
  switch (env.whatsappProvider) {
    case 'console':
      return createConsoleWhatsappProvider();
    case 'none':
      return createDisabledWhatsappProvider();
    default:
      return null;
  }
}

export async function sendWhatsapp({ to, message }) {
  const provider = resolveProvider();
  if (!provider) {
    throw new Error(`WhatsApp provider "${env.whatsappProvider}" is not implemented yet`);
  }
  return provider.send({ to, message });
}

export default { sendWhatsapp };
