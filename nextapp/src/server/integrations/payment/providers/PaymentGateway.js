import { AppError } from '../../../utils/errors.js';

/**
 * Base class every payment gateway extends.
 *
 * The contract paymentService.recordPayment() depends on is:
 *
 *   charge({ amount, currency, method, metadata }) -> {
 *     success:       boolean,
 *     transactionId: string | null,
 *     raw:           object            // stored on payment.metadata.gatewayRaw
 *   }
 *
 * A declined or unfinished charge RESOLVES with `success: false` rather than
 * throwing: paymentService records a `failed` Payment row either way, which is
 * how a real reconciliation flow behaves. Throwing is reserved for the gateway
 * being misconfigured, which is an operator error, not a customer outcome.
 *
 * Card gateways (Stripe) can complete a charge in one server-side call. The
 * wallet gateways (PayPal, bKash, Nagad) cannot: the payer has to approve on
 * the provider's own page first. Those express that by resolving with
 * `success: false` and a `raw.requiresApproval` payload carrying the redirect
 * URL, and completing the payment on a second call once the caller passes the
 * provider's payment id back in `metadata`.
 */
export class PaymentGateway {
  /** Machine name persisted to payment.gateway. */
  get name() {
    throw new Error(`${this.constructor.name} must define a name`);
  }

  /** Currencies the provider accepts, or null when it accepts anything. */
  get supportedCurrencies() {
    return null;
  }

  /** False when required credentials are absent, so the resolver can refuse early. */
  isConfigured() {
    return true;
  }

  /** Throws a ConfigurationError naming what is missing. */
  assertConfigured() {
    if (!this.isConfigured()) {
      // 500, not 402: the customer's card is fine, the deployment is not.
      throw new AppError(
        `Payment gateway "${this.name}" is selected but not configured. ${this.configurationHint()}`,
        500
      );
    }
  }

  configurationHint() {
    return 'Check the gateway credentials in the environment.';
  }

  assertCurrencySupported(currency) {
    const supported = this.supportedCurrencies;
    if (supported && !supported.includes(String(currency).toUpperCase())) {
      return {
        success: false,
        transactionId: null,
        raw: {
          provider: this.name,
          error: `${this.name} does not support ${currency}; it accepts ${supported.join(', ')}`,
        },
      };
    }
    return null;
  }

  // eslint-disable-next-line no-unused-vars
  async charge({ amount, currency, method, metadata }) {
    throw new Error(`${this.constructor.name} must implement charge()`);
  }

  /** Uniform failure envelope so callers never have to special-case a provider. */
  failure(error, extra = {}) {
    return {
      success: false,
      transactionId: null,
      raw: { provider: this.name, error: String(error?.message || error), ...extra },
    };
  }

  success(transactionId, raw = {}) {
    return { success: true, transactionId, raw: { provider: this.name, ...raw } };
  }
}

/**
 * Currencies Stripe (and most processors) quote WITHOUT a minor unit -- an
 * amount of 1000 JPY is 1000, not 100000. Getting this wrong overcharges by
 * 100x, so it lives next to the conversion helper that uses it.
 */
const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA',
  'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF',
]);

/** Converts a decimal amount to the provider's smallest currency unit. */
export function toMinorUnits(amount, currency) {
  const value = Number(amount);
  if (!Number.isFinite(value)) throw new Error(`Invalid amount: ${amount}`);
  if (ZERO_DECIMAL_CURRENCIES.has(String(currency).toUpperCase())) {
    return Math.round(value);
  }
  return Math.round(value * 100);
}

/** Two-decimal string, the form the wallet APIs expect. */
export function toDecimalString(amount) {
  return Number(amount).toFixed(2);
}

export default PaymentGateway;
