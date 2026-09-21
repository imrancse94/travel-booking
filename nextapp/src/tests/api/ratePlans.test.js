// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { ensureRolesAndPermissions, createAdmin, createBookableHotel } from '../helpers/fixtures.js';
import { callRoute, bearer } from '../helpers/callRoute.js';

import { POST as login } from '../../app/api/v1/auth/login/route.js';
import { GET as listRoomRates, POST as createRoomRate } from '../../app/api/v1/rate-plans/room-rates/route.js';
import {
  PUT as updateRoomRate,
  DELETE as deleteRoomRate,
} from '../../app/api/v1/rate-plans/room-rates/[id]/route.js';

async function loginAs(email, password) {
  const res = await callRoute(login, { method: 'POST', path: '/api/v1/auth/login', body: { email, password } });
  return res.body.data.accessToken;
}

describe('room rates (/rate-plans/room-rates)', () => {
  let adminToken;

  beforeAll(async () => {
    await ensureRolesAndPermissions();
    const admin = await createAdmin();
    adminToken = await loginAs(admin.email, admin.password);
  });

  // Regression test: this path used to fall through to GET /rate-plans/:id,
  // which failed uuid validation on the literal string "room-rates" instead
  // of ever reaching the room-rates listing.
  it('lists room rates without a uuid validation error, unfiltered and filtered by roomTypeId', async () => {
    const { roomType } = await createBookableHotel();

    const unfiltered = await callRoute(listRoomRates, {
      method: 'GET',
      path: '/api/v1/rate-plans/room-rates',
      query: { limit: 100 },
      headers: bearer(adminToken),
    });
    expect(unfiltered.status).toBe(200);
    expect(unfiltered.body.data.some((r) => r.roomTypeId === roomType.id)).toBe(true);

    const filtered = await callRoute(listRoomRates, {
      method: 'GET',
      path: '/api/v1/rate-plans/room-rates',
      query: { roomTypeId: roomType.id },
      headers: bearer(adminToken),
    });
    expect(filtered.status).toBe(200);
    expect(filtered.body.data.every((r) => r.roomTypeId === roomType.id)).toBe(true);
  });

  it('creates, updates and deletes a room rate through the un-nested endpoint', async () => {
    const { roomType, ratePlan } = await createBookableHotel();

    const create = await callRoute(createRoomRate, {
      method: 'POST',
      path: '/api/v1/rate-plans/room-rates',
      headers: bearer(adminToken),
      body: {
        roomTypeId: roomType.id,
        ratePlanId: ratePlan.id,
        startDate: '2030-01-01',
        endDate: '2030-12-31',
        price: 150,
      },
    });
    expect(create.status).toBe(201);
    const rateId = create.body.data.id;

    const update = await callRoute(updateRoomRate, {
      method: 'PUT',
      path: `/api/v1/rate-plans/room-rates/${rateId}`,
      headers: bearer(adminToken),
      routeParams: { id: rateId },
      body: { price: 175 },
    });
    expect(update.status).toBe(200);
    expect(update.body.data.price).toBe('175.00');

    const remove = await callRoute(deleteRoomRate, {
      method: 'DELETE',
      path: `/api/v1/rate-plans/room-rates/${rateId}`,
      headers: bearer(adminToken),
      routeParams: { id: rateId },
    });
    expect(remove.status).toBe(200);
  });

  it('404s for an unknown roomTypeId filter rather than silently returning everything', async () => {
    const res = await callRoute(listRoomRates, {
      method: 'GET',
      path: '/api/v1/rate-plans/room-rates',
      query: { roomTypeId: '00000000-0000-0000-0000-000000000000' },
      headers: bearer(adminToken),
    });
    expect(res.status).toBe(404);
  });
});
