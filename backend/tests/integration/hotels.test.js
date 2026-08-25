import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';
import { ensureRolesAndPermissions, createAdmin } from '../helpers/fixtures.js';

const app = createApp();

describe('hotel CRUD', () => {
  let adminToken;

  beforeAll(async () => {
    await ensureRolesAndPermissions();
    const admin = await createAdmin();
    const login = await request(app).post('/api/v1/auth/login').send({ email: admin.email, password: admin.password });
    adminToken = login.body.data.accessToken;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates, reads, updates, and soft-deletes a hotel', async () => {
    const create = await request(app)
      .post('/api/v1/hotels')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'CRUD Hotel', city: 'Dhaka', country: 'Bangladesh', starRating: 4 });
    expect(create.status).toBe(201);
    const hotelId = create.body.data.id;

    const getPublic = await request(app).get(`/api/v1/hotels/${hotelId}`);
    expect(getPublic.status).toBe(200);
    expect(getPublic.body.data.name).toBe('CRUD Hotel');

    const update = await request(app)
      .put(`/api/v1/hotels/${hotelId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'inactive' });
    expect(update.status).toBe(200);
    expect(update.body.data.status).toBe('inactive');

    const del = await request(app).delete(`/api/v1/hotels/${hotelId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(del.status).toBe(200);

    const afterDelete = await request(app).get(`/api/v1/hotels/${hotelId}`);
    expect(afterDelete.status).toBe(404);
  });

  it('returns 404 for a non-existent hotel', async () => {
    const res = await request(app).get('/api/v1/hotels/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });

  it('rejects an invalid payload (bad star rating)', async () => {
    const res = await request(app)
      .post('/api/v1/hotels')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Invalid', starRating: 9 });
    expect(res.status).toBe(422);
  });

  it('lists hotels with pagination metadata', async () => {
    const res = await request(app).get('/api/v1/hotels?page=1&limit=5');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta.pagination).toEqual(
      expect.objectContaining({ page: 1, limit: 5, total: expect.any(Number) })
    );
  });
});
