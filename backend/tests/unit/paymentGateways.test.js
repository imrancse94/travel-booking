import { describe, it, expect, afterEach, jest } from '@jest/globals';
import { toMinorUnits, toDecimalString } from '../../src/integrations/payment/providers/PaymentGateway.js';
import { MockGateway } from '../../src/integrations/payment/providers/MockGateway.js';
import { StripeGateway } from '../../src/integrations/payment/providers/StripeGateway.js';
import { PayPalGateway } from '../../src/integrations/payment/providers/PayPalGateway.js';
import { BkashGateway } from '../../src/integrations/payment/providers/BkashGateway.js';
import { NagadGateway } from '../../src/integrations/payment/providers/NagadGateway.js';

// Every gateway takes its config by constructor injection and talks to the
// network through either `fetch` or an injectable Stripe client, so these run
// with no credentials and no module mocking.

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
  jest.restoreAllMocks();
});

/** Queues JSON responses in call order. */
function stubFetch(...responses) {
  const calls = [];
  globalThis.fetch = jest.fn(async (url, init) => {
    calls.push({ url: String(url), init });
    const next = responses.shift() ?? { ok: true, body: {} };
    return {
      ok: next.ok !== false,
      status: next.status ?? (next.ok === false ? 400 : 200),
      json: async () => next.body,
    };
  });
  return calls;
}

describe('amount conversion', () => {
  it('converts to minor units for ordinary currencies', () => {
    expect(toMinorUnits(10.5, 'USD')).toBe(1050);
    expect(toMinorUnits(360, 'usd')).toBe(36000);
  });

  it('leaves zero-decimal currencies alone', () => {
    // Multiplying JPY by 100 would charge the customer a hundred times over.
    expect(toMinorUnits(1000, 'JPY')).toBe(1000);
    expect(toMinorUnits(5000, 'KRW')).toBe(5000);
  });

  it('rounds rather than truncating fractional minor units', () => {
    expect(toMinorUnits(10.005, 'USD')).toBe(1001);
    expect(toDecimalString(10.5)).toBe('10.50');
  });
});

describe('MockGateway', () => {
  it('always succeeds and returns a traceable transaction id', async () => {
    const result = await new MockGateway().charge({ amount: 100, currency: 'USD', method: 'card' });
    expect(result.success).toBe(true);
    expect(result.transactionId).toMatch(/^mock_/);
  });
});

describe('StripeGateway', () => {
  const config = { secretKey: 'sk_test_x', apiVersion: '2024-06-20', testPaymentMethod: 'pm_card_visa' };

  function withIntent(intent) {
    const gateway = new StripeGateway(config);
    const create = jest.fn(async () => intent);
    gateway._client = { paymentIntents: { create } };
    return { gateway, create };
  }

  it('reports an unconfigured gateway as a deployment error, not a decline', async () => {
    const gateway = new StripeGateway({ secretKey: '' });
    expect(gateway.isConfigured()).toBe(false);
    await expect(gateway.charge({ amount: 10, currency: 'USD' })).rejects.toThrow(/STRIPE_SECRET_KEY/);
  });

  it('charges in minor units and succeeds on a succeeded intent', async () => {
    const { gateway, create } = withIntent({ id: 'pi_1', status: 'succeeded', amount_received: 36000 });
    const result = await gateway.charge({ amount: 360, currency: 'USD', method: 'card', metadata: {} });

    expect(result.success).toBe(true);
    expect(result.transactionId).toBe('pi_1');
    expect(create.mock.calls[0][0]).toMatchObject({ amount: 36000, currency: 'usd', confirm: true });
  });

  it('uses the card the browser collected in preference to the sandbox default', async () => {
    const { gateway, create } = withIntent({ id: 'pi_2', status: 'succeeded' });
    await gateway.charge({ amount: 10, currency: 'USD', metadata: { paymentMethodId: 'pm_from_elements' } });
    expect(create.mock.calls[0][0].payment_method).toBe('pm_from_elements');
  });

  it('passes an idempotency key through so a retry cannot double-charge', async () => {
    const { gateway, create } = withIntent({ id: 'pi_3', status: 'succeeded' });
    await gateway.charge({ amount: 10, currency: 'USD', metadata: { idempotencyKey: 'booking-1' } });
    expect(create.mock.calls[0][1]).toEqual({ idempotencyKey: 'booking-1' });
  });

  it('does not report 3-D Secure as paid, and hands back the client secret', async () => {
    const { gateway } = withIntent({ id: 'pi_4', status: 'requires_action', client_secret: 'cs_test' });
    const result = await gateway.charge({ amount: 10, currency: 'USD' });

    expect(result.success).toBe(false);
    expect(result.raw.requiresAction).toBe(true);
    expect(result.raw.clientSecret).toBe('cs_test');
  });

  it('turns a declined card into a failed charge rather than throwing', async () => {
    const gateway = new StripeGateway(config);
    gateway._client = {
      paymentIntents: {
        create: jest.fn(async () => {
          throw Object.assign(new Error('Your card was declined.'), { code: 'card_declined', type: 'StripeCardError' });
        }),
      },
    };
    const result = await gateway.charge({ amount: 10, currency: 'USD' });

    expect(result.success).toBe(false);
    expect(result.raw.stripeCode).toBe('card_declined');
  });
});

describe('PayPalGateway', () => {
  const config = { clientId: 'id', clientSecret: 'secret', baseUrl: 'https://api-m.sandbox.paypal.com' };

  it('creates an order and asks for approval instead of claiming payment', async () => {
    stubFetch(
      { body: { access_token: 't', expires_in: 3600 } },
      { body: { id: 'ORDER1', status: 'CREATED', links: [{ rel: 'approve', href: 'https://paypal/approve' }] } }
    );
    const result = await new PayPalGateway(config).charge({ amount: 25, currency: 'USD', metadata: {} });

    expect(result.success).toBe(false);
    expect(result.raw.requiresApproval).toBe(true);
    expect(result.raw.approvalUrl).toBe('https://paypal/approve');
    expect(result.raw.orderId).toBe('ORDER1');
  });

  it('captures an approved order and reports success', async () => {
    stubFetch(
      { body: { access_token: 't', expires_in: 3600 } },
      {
        body: {
          status: 'COMPLETED',
          purchase_units: [{ payments: { captures: [{ id: 'CAP1', status: 'COMPLETED', amount: { value: '25.00' } }] } }],
        },
      }
    );
    const result = await new PayPalGateway(config).charge({
      amount: 25, currency: 'USD', metadata: { orderId: 'ORDER1' },
    });

    expect(result.success).toBe(true);
    expect(result.transactionId).toBe('CAP1');
  });

  it('sends the amount as a two-decimal string, which the Orders API requires', async () => {
    const calls = stubFetch({ body: { access_token: 't', expires_in: 3600 } }, { body: { id: 'O', links: [] } });
    await new PayPalGateway(config).charge({ amount: 25.5, currency: 'USD', metadata: {} });

    const body = JSON.parse(calls[1].init.body);
    expect(body.purchase_units[0].amount).toEqual({ currency_code: 'USD', value: '25.50' });
  });
});

describe('BkashGateway', () => {
  const config = {
    appKey: 'k', appSecret: 's', username: 'u', password: 'p',
    baseUrl: 'https://tokenized.sandbox.bka.sh/v1.2.0-beta', callbackUrl: 'https://app/callback',
  };

  it('refuses a currency it cannot settle', async () => {
    const result = await new BkashGateway(config).charge({ amount: 10, currency: 'USD', metadata: {} });
    expect(result.success).toBe(false);
    expect(result.raw.error).toMatch(/does not support USD/);
  });

  it('creates a payment and asks for approval', async () => {
    stubFetch(
      { body: { id_token: 'tok', expires_in: 3600 } },
      { body: { statusCode: '0000', paymentID: 'PAY1', bkashURL: 'https://bkash/approve' } }
    );
    const result = await new BkashGateway(config).charge({ amount: 500, currency: 'BDT', metadata: {} });

    expect(result.raw.requiresApproval).toBe(true);
    expect(result.raw.paymentID).toBe('PAY1');
  });

  it('executes an approved payment and reports the trxID', async () => {
    stubFetch(
      { body: { id_token: 'tok', expires_in: 3600 } },
      { body: { statusCode: '0000', transactionStatus: 'Completed', trxID: 'TRX1', amount: '500' } }
    );
    const result = await new BkashGateway(config).charge({
      amount: 500, currency: 'BDT', metadata: { paymentID: 'PAY1' },
    });

    expect(result.success).toBe(true);
    expect(result.transactionId).toBe('TRX1');
  });

  it('treats a 200 response carrying an error statusCode as a failure', async () => {
    // bKash answers 200 even for business failures, so HTTP status alone lies.
    stubFetch(
      { body: { id_token: 'tok', expires_in: 3600 } },
      { body: { statusCode: '2001', statusMessage: 'Invalid App Key' } }
    );
    const result = await new BkashGateway(config).charge({ amount: 500, currency: 'BDT', metadata: {} });

    expect(result.success).toBe(false);
    expect(result.raw.error).toMatch(/Invalid App Key/);
  });
});

describe('NagadGateway', () => {
  const config = {
    merchantId: 'M1', merchantPrivateKey: 'key', nagadPublicKey: 'pub',
    baseUrl: 'https://api.mynagad.com/remote-payment-gateway-1.0', apiVersion: 'v-0.2.0',
  };

  it('refuses a currency it cannot settle', async () => {
    const result = await new NagadGateway(config).charge({ amount: 10, currency: 'USD', metadata: {} });
    expect(result.success).toBe(false);
    expect(result.raw.error).toMatch(/does not support USD/);
  });

  it('wraps the portal\'s bare base64 keys into PEM', () => {
    const pem = NagadGateway.toPem('QUJDRA=='.repeat(12), 'PRIVATE KEY');
    expect(pem.startsWith('-----BEGIN PRIVATE KEY-----\n')).toBe(true);
    expect(pem.endsWith('\n-----END PRIVATE KEY-----')).toBe(true);
    // Already-PEM input is passed through untouched.
    const already = '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----';
    expect(NagadGateway.toPem(already, 'PRIVATE KEY')).toBe(already);
  });

  it('formats the timestamp as the 14-digit GMT+6 string Nagad requires', () => {
    expect(NagadGateway.timestamp()).toMatch(/^\d{14}$/);
  });

  it('sends the amount in the COMPLETE call, not initialize, and returns the approval URL', async () => {
    // Nagad's checkout is two server calls before the payer sees anything, and
    // the amount belongs to the second one. Crypto is stubbed because real RSA
    // keys are not available here; the flow and payload placement are what
    // this asserts.
    const gateway = new NagadGateway(config);
    gateway.encrypt = (plain) => `enc(${plain})`;
    gateway.sign = () => 'sig';
    gateway.decrypt = () => JSON.stringify({ paymentReferenceId: 'REF1', challenge: 'CHAL' });

    const calls = stubFetch(
      { body: { sensitiveData: 'encrypted-by-nagad', signature: 's' } },
      { body: { status: 'Success', callBackUrl: 'https://nagad/approve' } }
    );

    const result = await gateway.charge({ amount: 500, currency: 'BDT', metadata: { bookingId: 'b1' } });

    expect(calls).toHaveLength(2);
    expect(calls[0].url).toContain('/check-out/initialize/');
    expect(calls[1].url).toContain('/check-out/complete/REF1');

    // The amount and the echoed challenge ride on the second call only.
    const initSensitive = JSON.parse(calls[0].init.body).sensitiveData;
    expect(initSensitive).not.toContain('"amount"');
    const completeSensitive = JSON.parse(calls[1].init.body).sensitiveData;
    expect(completeSensitive).toContain('"amount":"500"');
    expect(completeSensitive).toContain('"challenge":"CHAL"');
    expect(completeSensitive).toContain('"currencyCode":"050"');

    expect(result.success).toBe(false);
    expect(result.raw.requiresApproval).toBe(true);
    expect(result.raw.approvalUrl).toBe('https://nagad/approve');
    expect(result.raw.paymentReferenceId).toBe('REF1');
  });

  it('reports a verified payment as successful', async () => {
    stubFetch({ body: { status: 'Success', issuerPaymentRefNo: 'NAG1', amount: '500', orderId: 'O1' } });
    const result = await new NagadGateway(config).charge({
      amount: 500, currency: 'BDT', metadata: { paymentReferenceId: 'REF1' },
    });

    expect(result.success).toBe(true);
    expect(result.transactionId).toBe('NAG1');
  });
});
