import { env } from '../../config/env.js';
import { createMockPaymentGateway } from './providers/mockGateway.js';

// Resolves the active payment gateway adapter. Only `mock` is implemented
// today; `stripe`/`paypal` are one-file additions later (create
// providers/stripeGateway.js or providers/paypalGateway.js implementing the
// same `{ name, async charge({ amount, currency, method, metadata }) }`
// shape and wire it in below) -- same spirit as integrations/sms/smsProvider.js.
export function resolvePaymentGateway(gatewayName) {
  const name = gatewayName || env.paymentGateway;

  switch (name) {
    case 'mock':
      return createMockPaymentGateway();
    case 'stripe':
      throw new Error('Payment gateway "stripe" is not implemented yet');
    case 'paypal':
      throw new Error('Payment gateway "paypal" is not implemented yet');
    default:
      throw new Error(`Unknown payment gateway "${name}"`);
  }
}
