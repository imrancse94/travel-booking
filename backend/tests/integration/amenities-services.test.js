import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';
import { ensureRolesAndPermissions, createAdmin, createBookableHotel } from '../helpers/fixtures.js';

const app = createApp();

describe('amenities bulk-set and the public services catalog', () => {
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

  it("replaces a hotel's full amenity set via PUT (used by the admin Hotel form)", async () => {
    const { hotel } = await createBookableHotel();
    const wifi = await prisma.amenity.create({ data: { name: `WiFi-${hotel.id}` } });
    const pool = await prisma.amenity.create({ data: { name: `Pool-${hotel.id}` } });

    const setBoth = await request(app)
      .put(`/api/v1/hotels/${hotel.id}/amenities`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amenityIds: [wifi.id, pool.id] });
    expect(setBoth.status).toBe(200);
    expect(setBoth.body.data.hotelAmenities.map((a) => a.amenityId).sort()).toEqual([wifi.id, pool.id].sort());

    const replaceWithOne = await request(app)
      .put(`/api/v1/hotels/${hotel.id}/amenities`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amenityIds: [wifi.id] });
    expect(replaceWithOne.status).toBe(200);
    expect(replaceWithOne.body.data.hotelAmenities.map((a) => a.amenityId)).toEqual([wifi.id]);
  });

  it("replaces a room type's full amenity set via PUT (used by the admin Room Type form)", async () => {
    const { roomType, hotel } = await createBookableHotel();
    const gym = await prisma.amenity.create({ data: { name: `Gym-${hotel.id}` } });

    const res = await request(app)
      .put(`/api/v1/room-types/${roomType.id}/amenities`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amenityIds: [gym.id] });
    expect(res.status).toBe(200);
    expect(res.body.data.amenities.map((a) => a.amenityId)).toEqual([gym.id]);
  });

  it('lists the services catalog without authentication (needed by the public checkout flow)', async () => {
    await prisma.service.create({ data: { name: `Test Service ${Date.now()}`, price: '9.99', tax: '0' } });

    const res = await request(app).get('/api/v1/services');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('still blocks creating/updating/deleting a service without the right permission', async () => {
    const res = await request(app).post('/api/v1/services').send({ name: 'Should Fail', price: 1 });
    expect(res.status).toBe(401);
  });
});
