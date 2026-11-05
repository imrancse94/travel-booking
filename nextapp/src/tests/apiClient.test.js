import { ApiClient } from '../lib/ApiClient.js';
import { compactParams } from '../utils/queryParams.js';

/** Resolves every request with the config the interceptors produced. */
function clientWithEchoAdapter(options = {}) {
  const client = new ApiClient({ baseURL: 'http://api.test/v1', ...options });
  client.instance.defaults.adapter = (config) =>
    Promise.resolve({ data: { params: config.params ?? null, headers: config.headers }, status: 200, config });
  return client;
}

describe('compactParams', () => {
  it('drops empty strings, null and undefined but keeps falsy-but-real values', () => {
    expect(
      compactParams({ page: 1, limit: 20, status: '', hotelId: null, agentId: undefined, starRating: 0, paid: false })
    ).toEqual({ page: 1, limit: 20, starRating: 0, paid: false });
  });

  it('passes non-objects straight through', () => {
    expect(compactParams(undefined)).toBeUndefined();
    expect(compactParams(null)).toBeNull();
  });
});

describe('ApiClient', () => {
  it('never puts unselected filters on the wire', async () => {
    // `?status=` / `?hotelId=` are 422s from the API's zod query validators.
    const client = clientWithEchoAdapter();

    const res = await client.get('/hotels', { params: { page: 1, limit: 20, status: '', hotelId: '' } });

    expect(res.params).toEqual({ page: 1, limit: 20 });
  });

  it('leaves requests without params alone', async () => {
    const client = clientWithEchoAdapter();
    const res = await client.get('/dashboard');
    expect(res.params).toBeNull();
  });

  it('attaches the bearer token when one is available', async () => {
    const client = clientWithEchoAdapter({ getAccessToken: () => 'token-123' });
    const res = await client.get('/auth/me');
    expect(res.headers.Authorization).toBe('Bearer token-123');
  });

  it('normalizes API errors and reports 401s to the session handler', async () => {
    const onUnauthorized = vi.fn();
    const client = new ApiClient({ baseURL: 'http://api.test/v1', onUnauthorized });
    client.instance.defaults.adapter = () =>
      Promise.reject(
        Object.assign(new Error('Request failed'), {
          response: { status: 401, data: { success: false, message: 'Invalid or expired token', errors: [] } },
        })
      );

    await expect(client.get('/bookings')).rejects.toMatchObject({
      message: 'Invalid or expired token',
      statusCode: 401,
      isApiError: true,
    });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });
});
