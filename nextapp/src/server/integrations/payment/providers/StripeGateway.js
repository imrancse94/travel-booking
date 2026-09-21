import Stripe from 'stripe';
import { env } from '../../../config/env.js';
import { PaymentGateway, toMinorUnits } from './PaymentGateway.js';

/**
 * Stripe, via PaymentIntents.
 *
 * Unlike the wallet gateways, a card charge completes in a single server-side
 * call, so this maps cleanly onto charge(). Two ways in:
 *
 *   - `metadata.paymentMethodId` — a `pm_...` collected by Stripe Elements in
 *     the browser. This is the production path; card data never touches us.
 *   - otherwise, STRIPE_TEST_PAYMENT_METHOD (default `pm_card_visa`), which is
 *     only meaningful against a sandbox key and is what makes the flow
 *     exercisable end to end without a card form.
 *
 * 3-D Secure is deliberately NOT auto-completed: if the intent comes back
 * `requires_action` the charge is reported as unfinished with the client
 * secret attached, because finishing it requires the browser.
 */
export class StripeGateway extends PaymentGateway {
  constructor(config = env.stripe) {
    super();
    this.config = config;
    this._client = null;
  }

  get name() {
    return 'stripe';
  }

  isConfigured() {
    return Boolean(this.config.secretKey);
  }

  configurationHint() {
    return 'Set STRIPE_SECRET_KEY (use the sk_test_... key for sandbox).';
  }

  /** Lazy so importing this module never requires credentials to be present. */
  get client() {
    if (!this._client) {
      this._client = new Stripe(this.config.secretKey, { apiVersion: this.config.apiVersion });
    }
    return this._client;
  }

  async charge({ amount, currency, method, metadata }) {
    this.assertConfigured();

    const paymentMethod = metadata?.paymentMethodId || this.config.testPaymentMethod;
    if (!paymentMethod) {
      return this.failure(
        'No payment method. Send metadata.paymentMethodId from Stripe Elements, or set STRIPE_TEST_PAYMENT_METHOD for sandbox runs.'
      );
    }

    try {
      const intent = await this.client.paymentIntents.create(
        {
          amount: toMinorUnits(amount, currency),
          currency: String(currency).toLowerCase(),
          payment_method: paymentMethod,
          confirm: true,
          // Without this Stripe may pick a redirect-based method and reject a
          // server-side confirm that has nowhere to redirect to.
          automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
          metadata: {
            bookingMethod: method ?? '',
            ...Object.fromEntries(
              Object.entries(metadata || {})
                .filter(([k]) => k !== 'paymentMethodId')
                .map(([k, v]) => [k, String(v)])
            ),
          },
        },
        // Retrying a timed-out request must not double-charge the customer.
        metadata?.idempotencyKey ? { idempotencyKey: metadata.idempotencyKey } : undefined
      );

      if (intent.status === 'succeeded') {
        return this.success(intent.id, { status: intent.status, amountReceived: intent.amount_received });
      }

      if (intent.status === 'requires_action') {
        return this.failure('Payment requires additional authentication (3-D Secure)', {
          requiresAction: true,
          paymentIntentId: intent.id,
          clientSecret: intent.client_secret,
          status: intent.status,
        });
      }

      return this.failure(`Stripe returned status "${intent.status}"`, {
        paymentIntentId: intent.id,
        status: intent.status,
      });
    } catch (err) {
      // A declined card is a StripeCardError -- a customer outcome, not an
      // exception, so it resolves as a failed charge like any other decline.
      return this.failure(err, { stripeCode: err?.code, stripeType: err?.type });
    }
  }
}

export default StripeGateway;
