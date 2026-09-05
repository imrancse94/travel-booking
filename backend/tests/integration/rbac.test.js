import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { disconnectDb } from '../../src/db/index.js';
import { ensureRolesAndPermissions, createAdmin, createCustomerUser } from '../helpers/fixtures.js';

const app = createApp();

async function login(email, password) {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password });
  return res.body.data.accessToken;
}

describe('RBAC / authorization', () => {
  let adminToken;
  let customerToken;

  beforeAll(async () => {
    await ensureRolesAndPermissions();
    const admin = await createAdmin();
    const customer = await createCustomerUser();
    adminToken = await login(admin.email, admin.password);
    customerToken = await login(customer.email, customer.password);
  });

  afterAll(async () => {
    await disconnectDb();
  });

  it('blocks unauthenticated requests to protected resources', async () => {
    const res = await request(app).get('/api/v1/users');
    expect(res.status).toBe(401);
  });

  it('blocks a Customer from creating a hotel (no hotels.create permission)', async () => {
    const res = await request(app)
      .post('/api/v1/hotels')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ name: 'Should Not Be Created' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('blocks a Customer from listing users (no users.view permission)', async () => {
    const res = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(403);
  });

  it('allows Super Admin to create a hotel', async () => {
    const res = await request(app)
      .post('/api/v1/hotels')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'RBAC Test Hotel', city: 'Testville' });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('RBAC Test Hotel');
  });

  it('rejects an invalid/garbage bearer token', async () => {
    const res = await request(app).get('/api/v1/users').set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });
});
