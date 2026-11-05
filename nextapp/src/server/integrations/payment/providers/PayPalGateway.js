import { env } from '../../../config/env.js';
import { PaymentGateway, toDecimalString } from './PaymentGateway.js';

/**
 * PayPal, via the Orders v2 API.
 *
 * PayPal is a two-step, buyer-approved flow, so a single server call cannot
 * take money from someone who has not approved yet:
 *
 *   1. charge() with no `metadata.orderId` CREATES an order and resolves with
 *      success:false plus `raw.requiresApproval` and the approval URL. The
 *      caller sends the payer there.
 *   2. charge() with `metadata.orderId` CAPTURES that approved order and
 *      resolves success:true.
 *
 * Reporting step 1 as an unfinished charge (rather than a fake success) is the
 * point: paymentService writes a `failed` Payment row carrying the approval URL
 * in its metadata, so nothing is ever recorded as paid before PayPal says so.
 */
export class PayPalGateway extends PaymentGateway {
  constructor(config = env.paypal) {
    super();
    this.config = config;
    this._token = null;
    this._tokenExpiresAt = 0;
  }

  get name() {
    return 'paypal';
  }

  isConfigured() {
    return Boolean(this.config.clientId && this.config.clientSecret);
  }

  configurationHint() {
    return 'Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET (sandbox credentials from the PayPal developer dashboard).';
  }

  get baseUrl() {
    return this.config.baseUrl;
  }

  /** OAuth2 client-credentials token, cached until shortly before it expires. */
  async accessToken() {
    if (this._token && Date.now() < this._tokenExpiresAt) return this._token;

    const basic = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');
    const res = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body?.error_description || 'PayPal token request failed');

    this._token = body.access_token;
    // 60s of slack so a token cannot expire mid-request.
    this._tokenExpiresAt = Date.now() + Math.max(0, (body.expires_in || 0) - 60) * 1000;
    return this._token;
  }

  async request(path, { method = 'POST', body, idempotencyKey } = {}) {
    const token = await this.accessToken();
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    if (idempotencyKey) headers['PayPal-Request-Id'] = idempotencyKey;

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json?.message || json?.error_description || `PayPal ${method} ${path} failed (${res.status})`);
    }
    return json;
  }

  async charge({ amount, currency, metadata }) {
    this.assertConfigured();
    const unsupported = this.assertCurrencySupported(currency);
    if (unsupported) return unsupported;

    try {
      if (metadata?.orderId) return await this.capture(metadata.orderId);
      return await this.createOrder({ amount, currency, metadata });
    } catch (err) {
      return this.failure(err);
    }
  }

  async createOrder({ amount, currency, metadata }) {
    const order = await this.request('/v2/checkout/orders', {
      body: {
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: { currency_code: String(currency).toUpperCase(), value: toDecimalString(amount) },
            custom_id: metadata?.bookingId ? String(metadata.bookingId) : undefined,
          },
        ],
        application_context: {
          return_url: this.config.returnUrl || undefined,
          cancel_url: this.config.cancelUrl || undefined,
          user_action: 'PAY_NOW',
        },
      },
      idempotencyKey: metadata?.idempotencyKey,
    });

    const approvalUrl = (order.links || []).find((l) => l.rel === 'approve')?.href || null;

    return this.failure('PayPal order created; awaiting payer approval', {
      requiresApproval: true,
      orderId: order.id,
      approvalUrl,
      status: order.status,
    });
  }

  async capture(orderId) {
    const captured = await this.request(`/v2/checkout/orders/${orderId}/capture`);
    const capture = captured?.purchase_units?.[0]?.payments?.captures?.[0];

    if (captured.status !== 'COMPLETED' || capture?.status !== 'COMPLETED') {
      return this.failure(`PayPal capture returned status "${capture?.status || captured.status}"`, {
        orderId,
        status: captured.status,
      });
    }

    return this.success(capture.id, { orderId, status: capture.status, amount: capture.amount });
  }
}

export default PayPalGateway;
