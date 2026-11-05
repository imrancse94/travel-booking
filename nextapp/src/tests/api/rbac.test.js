// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { ensureRolesAndPermissions, createAdmin, createCustomerUser } from '../helpers/fixtures.js';
import { callRoute, bearer } from '../helpers/callRoute.js';

import { POST as login } from '../../app/api/v1/auth/login/route.js';
import { GET as listUsers } from '../../app/api/v1/users/route.js';
import { POST as createHotel } from '../../app/api/v1/hotels/route.js';

async function loginAs(email, password) {
  const res = await callRoute(login, { method: 'POST', path: '/api/v1/auth/login', body: { email, password } });
  return res.body.data.accessToken;
}

describe('RBAC / authorization', () => {
  let adminToken;
  let customerToken;

  beforeAll(async () => {
    await ensureRolesAndPermissions();
    const admin = await createAdmin();
    const customer = await createCustomerUser();
    adminToken = await loginAs(admin.email, admin.password);
    customerToken = await loginAs(customer.email, customer.password);
  });

  it('blocks unauthenticated requests to protected resources', async () => {
    const res = await callRoute(listUsers, { method: 'GET', path: '/api/v1/users' });
    expect(res.status).toBe(401);
  });

  it('blocks a Customer from creating a hotel (no hotels.create permission)', async () => {
    const res = await callRoute(createHotel, {
      method: 'POST',
      path: '/api/v1/hotels',
      headers: bearer(customerToken),
      body: { name: 'Should Not Be Created' },
    });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('blocks a Customer from listing users (no users.view permission)', async () => {
    const res = await callRoute(listUsers, {
      method: 'GET',
      path: '/api/v1/users',
      headers: bearer(customerToken),
    });
    expect(res.status).toBe(403);
  });

  it('allows Super Admin to create a hotel', async () => {
    const res = await callRoute(createHotel, {
      method: 'POST',
      path: '/api/v1/hotels',
      headers: bearer(adminToken),
      body: { name: 'RBAC Test Hotel', city: 'Testville' },
    });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('RBAC Test Hotel');
  });

  it('rejects an invalid/garbage bearer token', async () => {
    const res = await callRoute(listUsers, {
      method: 'GET',
      path: '/api/v1/users',
      headers: bearer('not-a-real-token'),
    });
    expect(res.status).toBe(401);
  });
});
