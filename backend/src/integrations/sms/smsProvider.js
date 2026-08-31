import logger from '../../config/logger.js';
import { env } from '../../config/env.js';

// SMS channel abstraction (instructions.md section 29). Selecting a provider
// is a one-file change here -- nothing outside this module knows which gateway
// is in use, and the notification fan-out calls sendSms() either way.
//
//   SMS_PROVIDER=none      -> channel disabled, calls are skipped (default)
//   SMS_PROVIDER=console   -> development provider: logs the message
//   SMS_PROVIDER=twilio... -> add a real provider below

/**
 * Development provider: logs instead of sending, mirroring the console email
 * provider, so the SMS path stays exercisable locally with no gateway account.
 */
function createConsoleSmsProvider() {
  return {
    name: 'console',
    async send({ to, message }) {
      logger.info({ to, preview: String(message || '').slice(0, 160) }, '[sms:console] would send SMS');
      return { provider: 'console', to, sent: true };
    },
  };
}

function createDisabledSmsProvider() {
  return {
    name: 'none',
    async send({ to }) {
      logger.debug({ to }, '[sms] provider not configured, skipping');
      return { provider: 'none', skipped: true };
    },
  };
}

function resolveProvider() {
  switch (env.smsProvider) {
    case 'console':
      return createConsoleSmsProvider();
    case 'none':
      return createDisabledSmsProvider();
    default:
      return null;
  }
}

export async function sendSms({ to, message }) {
  const provider = resolveProvider();
  if (!provider) {
    throw new Error(`SMS provider "${env.smsProvider}" is not implemented yet`);
  }
  return provider.send({ to, message });
}

export default { sendSms };
