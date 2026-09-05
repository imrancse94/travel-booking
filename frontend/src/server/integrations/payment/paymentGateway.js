import { env } from '../../config/env.js';
import { MockGateway } from './providers/MockGateway.js';
import { StripeGateway } from './providers/StripeGateway.js';
import { PayPalGateway } from './providers/PayPalGateway.js';
import { BkashGateway } from './providers/BkashGateway.js';
import { NagadGateway } from './providers/NagadGateway.js';

/**
 * Resolves the active payment gateway adapter.
 *
 * Each provider is its own class extending PaymentGateway, so adding one is a
 * new file plus a line in this table -- nothing outside this module knows which
 * gateway is in use. Credentials come from env constants and every provider
 * defaults to its sandbox host (see config/env.js).
 *
 *   mock    always succeeds; the default, and what the test suite runs against
 *   stripe  cards, charged server-side in one call
 *   paypal  buyer-approved: create order -> approve -> capture
 *   bkash   buyer-approved: create -> approve -> execute   (BDT only)
 *   nagad   buyer-approved: initialize -> approve -> verify (BDT only)
 */
const GATEWAYS = {
  mock: MockGateway,
  stripe: StripeGateway,
  paypal: PayPalGateway,
  bkash: BkashGateway,
  nagad: NagadGateway,
};

export const SUPPORTED_GATEWAYS = Object.keys(GATEWAYS);

export function resolvePaymentGateway(gatewayName) {
  const name = gatewayName || env.paymentGateway;
  const Gateway = GATEWAYS[name];

  if (!Gateway) {
    throw new Error(`Unknown payment gateway "${name}". Supported: ${SUPPORTED_GATEWAYS.join(', ')}`);
  }

  const gateway = new Gateway();
  // Fails here rather than mid-charge, so a missing key is an obvious
  // deployment error instead of a mysterious decline for the customer.
  gateway.assertConfigured();
  return gateway;
}
