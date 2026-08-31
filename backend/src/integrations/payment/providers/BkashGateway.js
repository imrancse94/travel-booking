import { env } from '../../../config/env.js';
import { PaymentGateway, toDecimalString } from './PaymentGateway.js';

/**
 * bKash, via Tokenized Checkout.
 *
 * Same two-step shape as PayPal, because bKash also needs the payer to approve
 * on bKash's own page:
 *
 *   1. charge() with no `metadata.paymentID` calls /create and resolves
 *      success:false with `raw.requiresApproval` + bkashURL.
 *   2. charge() with `metadata.paymentID` calls /execute and resolves
 *      success:true once bKash reports Completed.
 *
 * Auth is a grant token (id_token) that must accompany every call alongside the
 * app key; it is cached until just before expiry because /grant is rate limited.
 * BDT only -- bKash settles in no other currency.
 */
export class BkashGateway extends PaymentGateway {
  constructor(config = env.bkash) {
    super();
    this.config = config;
    this._token = null;
    this._tokenExpiresAt = 0;
  }

  get name() {
    return 'bkash';
  }

  get supportedCurrencies() {
    return ['BDT'];
  }

  isConfigured() {
    const { appKey, appSecret, username, password } = this.config;
    return Boolean(appKey && appSecret && username && password);
  }

  configurationHint() {
    return 'Set BKASH_APP_KEY, BKASH_APP_SECRET, BKASH_USERNAME and BKASH_PASSWORD (sandbox credentials from the bKash merchant portal).';
  }

  async grantToken() {
    if (this._token && Date.now() < this._tokenExpiresAt) return this._token;

    const res = await fetch(`${this.config.baseUrl}/tokenized/checkout/token/grant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        username: this.config.username,
        password: this.config.password,
      },
      body: JSON.stringify({ app_key: this.config.appKey, app_secret: this.config.appSecret }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.id_token) {
      throw new Error(body?.statusMessage || 'bKash token grant failed');
    }

    this._token = body.id_token;
    this._tokenExpiresAt = Date.now() + Math.max(0, Number(body.expires_in || 3600) - 60) * 1000;
    return this._token;
  }

  async request(path, body) {
    const token = await this.grantToken();
    const res = await fetch(`${this.config.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: token,
        'X-APP-Key': this.config.appKey,
      },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    // bKash answers 200 with a statusCode field even for business failures, so
    // the HTTP status alone is not enough to tell success from decline.
    if (!res.ok) throw new Error(json?.statusMessage || `bKash ${path} failed (${res.status})`);
    return json;
  }

  async charge({ amount, currency, metadata }) {
    this.assertConfigured();
    const unsupported = this.assertCurrencySupported(currency);
    if (unsupported) return unsupported;

    try {
      if (metadata?.paymentID) return await this.execute(metadata.paymentID);
      return await this.createPayment({ amount, metadata });
    } catch (err) {
      return this.failure(err);
    }
  }

  async createPayment({ amount, metadata }) {
    const created = await this.request('/tokenized/checkout/create', {
      mode: '0011', // checkout (payer approves on bKash), not agreement
      payerReference: metadata?.payerReference || metadata?.bookingId || 'booking',
      callbackURL: this.config.callbackUrl,
      amount: toDecimalString(amount),
      currency: 'BDT',
      intent: 'sale',
      merchantInvoiceNumber: String(metadata?.invoiceNumber || metadata?.bookingId || Date.now()),
    });

    if (created.statusCode && created.statusCode !== '0000') {
      return this.failure(created.statusMessage || `bKash create returned ${created.statusCode}`, {
        statusCode: created.statusCode,
      });
    }

    return this.failure('bKash payment created; awaiting payer approval', {
      requiresApproval: true,
      paymentID: created.paymentID,
      approvalUrl: created.bkashURL,
      status: created.transactionStatus,
    });
  }

  async execute(paymentID) {
    const executed = await this.request('/tokenized/checkout/execute', { paymentID });

    if (executed.statusCode && executed.statusCode !== '0000') {
      return this.failure(executed.statusMessage || `bKash execute returned ${executed.statusCode}`, {
        paymentID,
        statusCode: executed.statusCode,
      });
    }
    if (executed.transactionStatus !== 'Completed') {
      return this.failure(`bKash transaction status "${executed.transactionStatus}"`, {
        paymentID,
        status: executed.transactionStatus,
      });
    }

    return this.success(executed.trxID, {
      paymentID,
      status: executed.transactionStatus,
      amount: executed.amount,
      customerMsisdn: executed.customerMsisdn,
    });
  }
}

export default BkashGateway;
