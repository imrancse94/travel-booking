import crypto from 'node:crypto';
import { env } from '../../../config/env.js';
import { PaymentGateway } from './PaymentGateway.js';

/**
 * Nagad, via the Merchant Payment (checkout) API.
 *
 * Same two-step approval shape as PayPal and bKash, but Nagad additionally
 * signs and encrypts the sensitive parts of each request:
 *
 *   - the merchant's RSA PRIVATE key SIGNS the payload (SHA256withRSA)
 *   - Nagad's RSA PUBLIC key ENCRYPTS it (RSA/ECB/PKCS1Padding)
 *
 * Both keys are base64 DER from the Nagad merchant portal, so they are wrapped
 * into PEM here rather than asking operators to reformat them by hand.
 *
 *   1. charge() with no `metadata.paymentReferenceId` initialises the payment
 *      and resolves success:false with `raw.requiresApproval` + callBackUrl.
 *   2. charge() with `metadata.paymentReferenceId` verifies the completed
 *      payment and resolves success:true once Nagad reports Success.
 *
 * BDT only. Amounts are whole taka.
 */
export class NagadGateway extends PaymentGateway {
  constructor(config = env.nagad) {
    super();
    this.config = config;
  }

  get name() {
    return 'nagad';
  }

  get supportedCurrencies() {
    return ['BDT'];
  }

  isConfigured() {
    const { merchantId, merchantPrivateKey, nagadPublicKey } = this.config;
    return Boolean(merchantId && merchantPrivateKey && nagadPublicKey);
  }

  configurationHint() {
    return 'Set NAGAD_MERCHANT_ID, NAGAD_MERCHANT_PRIVATE_KEY and NAGAD_PUBLIC_KEY (base64 keys from the Nagad merchant portal).';
  }

  /** The portal hands out bare base64 DER; node:crypto needs PEM framing. */
  static toPem(key, label) {
    const trimmed = String(key).trim();
    if (trimmed.includes('-----BEGIN')) return trimmed;
    const wrapped = trimmed.replace(/\s+/g, '').match(/.{1,64}/g)?.join('\n') ?? '';
    return `-----BEGIN ${label}-----\n${wrapped}\n-----END ${label}-----`;
  }

  sign(payloadString) {
    const pem = NagadGateway.toPem(this.config.merchantPrivateKey, 'PRIVATE KEY');
    return crypto.sign('RSA-SHA256', Buffer.from(payloadString), pem).toString('base64');
  }

  encrypt(payloadString) {
    const pem = NagadGateway.toPem(this.config.nagadPublicKey, 'PUBLIC KEY');
    return crypto
      .publicEncrypt({ key: pem, padding: crypto.constants.RSA_PKCS1_PADDING }, Buffer.from(payloadString))
      .toString('base64');
  }

  /** Nagad encrypts its replies to the merchant's PUBLIC key, so only we can read them. */
  decrypt(base64Payload) {
    const pem = NagadGateway.toPem(this.config.merchantPrivateKey, 'PRIVATE KEY');
    return crypto
      .privateDecrypt(
        { key: pem, padding: crypto.constants.RSA_PKCS1_PADDING },
        Buffer.from(base64Payload, 'base64')
      )
      .toString();
  }

  /** Nagad requires GMT+6 local time in this exact format. */
  static timestamp() {
    const now = new Date(Date.now() + 6 * 60 * 60 * 1000);
    const p = (n, w = 2) => String(n).padStart(w, '0');
    return (
      `${now.getUTCFullYear()}${p(now.getUTCMonth() + 1)}${p(now.getUTCDate())}` +
      `${p(now.getUTCHours())}${p(now.getUTCMinutes())}${p(now.getUTCSeconds())}`
    );
  }

  headers(clientIp) {
    return {
      'Content-Type': 'application/json',
      'X-KM-Api-Version': this.config.apiVersion,
      'X-KM-IP-V4': clientIp || '127.0.0.1',
      'X-KM-Client-Type': 'PC_WEB',
    };
  }

  async charge({ amount, currency, metadata }) {
    this.assertConfigured();
    const unsupported = this.assertCurrencySupported(currency);
    if (unsupported) return unsupported;

    try {
      if (metadata?.paymentReferenceId) return await this.verify(metadata.paymentReferenceId);
      return await this.initialize({ amount, metadata });
    } catch (err) {
      return this.failure(err);
    }
  }

  /**
   * Nagad's checkout is two server calls before the payer sees anything:
   *
   *   initialize -> Nagad returns an ENCRYPTED paymentReferenceId + challenge
   *   complete   -> we echo that challenge back WITH the amount, and Nagad
   *                 returns the URL to send the payer to
   *
   * The amount belongs to the second call, not the first -- sending it to
   * initialize does nothing, which is how this gap first showed up (an unused
   * `amount` parameter).
   */
  async initialize({ amount, metadata }) {
    const orderId = String(metadata?.invoiceNumber || metadata?.bookingId || crypto.randomUUID());
    const dateTime = NagadGateway.timestamp();

    const initSensitive = JSON.stringify({
      merchantId: this.config.merchantId,
      datetime: dateTime,
      orderId,
      challenge: crypto.randomBytes(16).toString('hex'),
    });

    const initRes = await fetch(
      `${this.config.baseUrl}/api/dfs/check-out/initialize/${this.config.merchantId}/${orderId}`,
      {
        method: 'POST',
        headers: this.headers(metadata?.clientIp),
        body: JSON.stringify({
          accountNumber: this.config.merchantNumber || undefined,
          dateTime,
          sensitiveData: this.encrypt(initSensitive),
          signature: this.sign(initSensitive),
        }),
      }
    );
    const init = await initRes.json().catch(() => ({}));
    if (!initRes.ok || !init.sensitiveData) {
      return this.failure(init?.message || init?.reason || 'Nagad initialize failed', { orderId });
    }

    let paymentReferenceId;
    let challenge;
    try {
      ({ paymentReferenceId, challenge } = JSON.parse(this.decrypt(init.sensitiveData)));
    } catch (err) {
      return this.failure(`Could not read Nagad's initialize response: ${err.message}`, { orderId });
    }

    const completeSensitive = JSON.stringify({
      merchantId: this.config.merchantId,
      orderId,
      currencyCode: '050', // ISO 4217 numeric for BDT; Nagad wants the code, not "BDT"
      amount: String(amount),
      challenge,
    });

    const completeRes = await fetch(`${this.config.baseUrl}/api/dfs/check-out/complete/${paymentReferenceId}`, {
      method: 'POST',
      headers: this.headers(metadata?.clientIp),
      body: JSON.stringify({
        sensitiveData: this.encrypt(completeSensitive),
        signature: this.sign(completeSensitive),
        merchantCallbackURL: this.config.callbackUrl,
      }),
    });
    const complete = await completeRes.json().catch(() => ({}));
    if (!completeRes.ok || complete.status !== 'Success') {
      return this.failure(complete?.message || `Nagad complete returned status "${complete?.status}"`, {
        orderId,
        paymentReferenceId,
      });
    }

    return this.failure('Nagad payment initialised; awaiting payer approval', {
      requiresApproval: true,
      orderId,
      paymentReferenceId,
      approvalUrl: complete.callBackUrl,
    });
  }

  async verify(paymentReferenceId) {
    const res = await fetch(`${this.config.baseUrl}/api/dfs/verify/payment/${paymentReferenceId}`, {
      method: 'GET',
      headers: this.headers(),
    });
    const body = await res.json().catch(() => ({}));

    if (!res.ok || body.status !== 'Success') {
      return this.failure(body?.message || `Nagad verify returned status "${body?.status}"`, {
        paymentReferenceId,
        status: body?.status,
      });
    }

    return this.success(body.issuerPaymentRefNo || paymentReferenceId, {
      paymentReferenceId,
      status: body.status,
      amount: body.amount,
      orderId: body.orderId,
    });
  }
}

export default NagadGateway;
