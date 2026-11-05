// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { ensureRolesAndPermissions, createAdmin } from '../helpers/fixtures.js';
import { callRoute, bearer } from '../helpers/callRoute.js';

import { POST as login } from '../../app/api/v1/auth/login/route.js';
import { GET as getHotel, PUT as updateHotel, DELETE as deleteHotel } from '../../app/api/v1/hotels/[id]/route.js';
import { GET as listHotels, POST as createHotel } from '../../app/api/v1/hotels/route.js';

describe('hotel CRUD', () => {
  let adminToken;

  beforeAll(async () => {
    await ensureRolesAndPermissions();
    const admin = await createAdmin();
    const loginRes = await callRoute(login, {
      method: 'POST',
      path: '/api/v1/auth/login',
      body: { email: admin.email, password: admin.password },
    });
    adminToken = loginRes.body.data.accessToken;
  });

  it('creates, reads, updates, and soft-deletes a hotel', async () => {
    const create = await callRoute(createHotel, {
      method: 'POST',
      path: '/api/v1/hotels',
      headers: bearer(adminToken),
      body: { name: 'CRUD Hotel', city: 'Dhaka', country: 'Bangladesh', starRating: 4 },
    });
    expect(create.status).toBe(201);
    const hotelId = create.body.data.id;

    const getPublic = await callRoute(getHotel, {
      method: 'GET',
      path: `/api/v1/hotels/${hotelId}`,
      routeParams: { id: hotelId },
    });
    expect(getPublic.status).toBe(200);
    expect(getPublic.body.data.name).toBe('CRUD Hotel');

    const update = await callRoute(updateHotel, {
      method: 'PUT',
      path: `/api/v1/hotels/${hotelId}`,
      headers: bearer(adminToken),
      routeParams: { id: hotelId },
      body: { status: 'inactive' },
    });
    expect(update.status).toBe(200);
    expect(update.body.data.status).toBe('inactive');

    const del = await callRoute(deleteHotel, {
      method: 'DELETE',
      path: `/api/v1/hotels/${hotelId}`,
      headers: bearer(adminToken),
      routeParams: { id: hotelId },
    });
    expect(del.status).toBe(200);

    const afterDelete = await callRoute(getHotel, {
      method: 'GET',
      path: `/api/v1/hotels/${hotelId}`,
      routeParams: { id: hotelId },
    });
    expect(afterDelete.status).toBe(404);
  });

  it('returns 404 for a non-existent hotel', async () => {
    const res = await callRoute(getHotel, {
      method: 'GET',
      path: '/api/v1/hotels/00000000-0000-0000-0000-000000000000',
      routeParams: { id: '00000000-0000-0000-0000-000000000000' },
    });
    expect(res.status).toBe(404);
  });

  it('rejects an invalid payload (bad star rating)', async () => {
    const res = await callRoute(createHotel, {
      method: 'POST',
      path: '/api/v1/hotels',
      headers: bearer(adminToken),
      body: { name: 'Invalid', starRating: 9 },
    });
    expect(res.status).toBe(422);
  });

  it('lists hotels with pagination metadata', async () => {
    const res = await callRoute(listHotels, {
      method: 'GET',
      path: '/api/v1/hotels',
      query: { page: 1, limit: 5 },
    });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta.pagination).toEqual(
      expect.objectContaining({ page: 1, limit: 5, total: expect.any(Number) })
    );
  });
});
