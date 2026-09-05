import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { disconnectDb } from '../../src/db/index.js';
import { ensureRolesAndPermissions, createAdmin, createBookableHotel } from '../helpers/fixtures.js';

const app = createApp();

async function login(email, password) {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password });
  return res.body.data.accessToken;
}

describe('room rates (/rate-plans/room-rates)', () => {
  let adminToken;

  beforeAll(async () => {
    await ensureRolesAndPermissions();
    const admin = await createAdmin();
    adminToken = await login(admin.email, admin.password);
  });

  afterAll(async () => {
    await disconnectDb();
  });

  // Regression test: this path used to fall through to GET /rate-plans/:id,
  // which failed uuid validation on the literal string "room-rates" instead
  // of ever reaching the room-rates listing.
  it('lists room rates without a uuid validation error, unfiltered and filtered by roomTypeId', async () => {
    const { roomType } = await createBookableHotel();

    const unfiltered = await request(app)
      .get('/api/v1/rate-plans/room-rates?limit=100')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(unfiltered.status).toBe(200);
    expect(unfiltered.body.data.some((r) => r.roomTypeId === roomType.id)).toBe(true);

    const filtered = await request(app)
      .get(`/api/v1/rate-plans/room-rates?roomTypeId=${roomType.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(filtered.status).toBe(200);
    expect(filtered.body.data.every((r) => r.roomTypeId === roomType.id)).toBe(true);
  });

  it('creates, updates and deletes a room rate through the un-nested endpoint', async () => {
    const { roomType, ratePlan } = await createBookableHotel();

    const create = await request(app)
      .post('/api/v1/rate-plans/room-rates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        roomTypeId: roomType.id,
        ratePlanId: ratePlan.id,
        startDate: '2030-01-01',
        endDate: '2030-12-31',
        price: 150,
      });
    expect(create.status).toBe(201);
    const rateId = create.body.data.id;

    const update = await request(app)
      .put(`/api/v1/rate-plans/room-rates/${rateId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ price: 175 });
    expect(update.status).toBe(200);
    expect(update.body.data.price).toBe('175.00');

    const remove = await request(app)
      .delete(`/api/v1/rate-plans/room-rates/${rateId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(remove.status).toBe(200);
  });

  it('404s for an unknown roomTypeId filter rather than silently returning everything', async () => {
    const res = await request(app)
      .get('/api/v1/rate-plans/room-rates?roomTypeId=00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});
