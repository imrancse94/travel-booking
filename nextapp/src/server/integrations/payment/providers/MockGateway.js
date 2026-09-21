import crypto from 'node:crypto';
import { PaymentGateway } from './PaymentGateway.js';

/**
 * Development/demo gateway: always succeeds, so the whole booking flow stays
 * runnable with no payment credentials at all. It is the default
 * (PAYMENT_GATEWAY=mock) and the only gateway the test suite exercises.
 */
export class MockGateway extends PaymentGateway {
  get name() {
    return 'mock';
  }

  async charge({ amount, currency, method, metadata }) {
    return this.success(`mock_${crypto.randomUUID()}`, {
      amount,
      currency,
      method,
      metadata: metadata || {},
      simulatedAt: new Date().toISOString(),
    });
  }
}

export default MockGateway;
