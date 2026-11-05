// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../../server/db/index.js';
import { amenities, services } from '../../server/db/schema.js';
import { ensureRolesAndPermissions, createAdmin, createBookableHotel } from '../helpers/fixtures.js';
import { callRoute, bearer } from '../helpers/callRoute.js';

import { POST as login } from '../../app/api/v1/auth/login/route.js';
import { PUT as setHotelAmenities } from '../../app/api/v1/hotels/[id]/amenities/route.js';
import { PUT as setRoomTypeAmenities } from '../../app/api/v1/room-types/[id]/amenities/route.js';
import { GET as listServices, POST as createService } from '../../app/api/v1/services/route.js';

describe('amenities bulk-set and the public services catalog', () => {
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

  it("replaces a hotel's full amenity set via PUT (used by the admin Hotel form)", async () => {
    const { hotel } = await createBookableHotel();
    const [wifi] = await db.insert(amenities).values({ name: `WiFi-${hotel.id}` }).returning();
    const [pool] = await db.insert(amenities).values({ name: `Pool-${hotel.id}` }).returning();

    const setBoth = await callRoute(setHotelAmenities, {
      method: 'PUT',
      path: `/api/v1/hotels/${hotel.id}/amenities`,
      headers: bearer(adminToken),
      routeParams: { id: hotel.id },
      body: { amenityIds: [wifi.id, pool.id] },
    });
    expect(setBoth.status).toBe(200);
    expect(setBoth.body.data.hotelAmenities.map((a) => a.amenityId).sort()).toEqual([wifi.id, pool.id].sort());

    const replaceWithOne = await callRoute(setHotelAmenities, {
      method: 'PUT',
      path: `/api/v1/hotels/${hotel.id}/amenities`,
      headers: bearer(adminToken),
      routeParams: { id: hotel.id },
      body: { amenityIds: [wifi.id] },
    });
    expect(replaceWithOne.status).toBe(200);
    expect(replaceWithOne.body.data.hotelAmenities.map((a) => a.amenityId)).toEqual([wifi.id]);
  });

  it("replaces a room type's full amenity set via PUT (used by the admin Room Type form)", async () => {
    const { roomType, hotel } = await createBookableHotel();
    const [gym] = await db.insert(amenities).values({ name: `Gym-${hotel.id}` }).returning();

    const res = await callRoute(setRoomTypeAmenities, {
      method: 'PUT',
      path: `/api/v1/room-types/${roomType.id}/amenities`,
      headers: bearer(adminToken),
      routeParams: { id: roomType.id },
      body: { amenityIds: [gym.id] },
    });
    expect(res.status).toBe(200);
    expect(res.body.data.amenities.map((a) => a.amenityId)).toEqual([gym.id]);
  });

  it('lists the services catalog without authentication (needed by the public checkout flow)', async () => {
    await db.insert(services).values({ name: `Test Service ${Date.now()}`, price: '9.99', tax: '0' });

    const res = await callRoute(listServices, { method: 'GET', path: '/api/v1/services' });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('still blocks creating/updating/deleting a service without the right permission', async () => {
    const res = await callRoute(createService, {
      method: 'POST',
      path: '/api/v1/services',
      body: { name: 'Should Fail', price: 1 },
    });
    expect(res.status).toBe(401);
  });
});
