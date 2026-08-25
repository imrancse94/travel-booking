import crypto from 'node:crypto';

// Development/demo-only payment gateway: always succeeds so the system stays
// fully runnable without real payment credentials. Mirrors the shape every
// real gateway adapter (Stripe, PayPal, ...) must implement.
export function createMockPaymentGateway() {
  return {
    name: 'mock',
    async charge({ amount, currency, method, metadata }) {
      return {
        success: true,
        transactionId: `mock_${crypto.randomUUID()}`,
        raw: {
          provider: 'mock',
          amount,
          currency,
          method,
          metadata: metadata || {},
          simulatedAt: new Date().toISOString(),
        },
      };
    },
  };
}
