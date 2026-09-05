import logger from '../../../config/logger.js';

// Development-only email provider: logs the email instead of sending it, so
// the whole system stays runnable without real SMTP credentials.
export function createConsoleEmailProvider() {
  return {
    name: 'console',
    async send({ to, subject, html, text }) {
      logger.info({ to, subject, preview: (text || html || '').slice(0, 200) }, '[email:console] would send email');
      return { messageId: `console-${Date.now()}`, accepted: [to] };
    },
  };
}
