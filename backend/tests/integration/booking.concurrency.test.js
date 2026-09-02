import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';
import { ensureRolesAndPermissions, createCustomerUser, createBookableHotel, sampleGuest } from '../helpers/fixtures.js';

const app = createApp();

async function login(email, password) {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password });
  return res.body.data.accessToken;
}

// This is the scenario section 45/54 of the project brief calls out as
// critical: two (or more) requests racing to book the same room for
// overlapping dates must never both succeed. bookingService.createBooking
// guards this with a Postgres advisory lock taken in a stable sort order
// before re-checking overlap inside the transaction (see
// src/services/bookingService.js).
// Each test here seeds a hotel and races N real HTTP requests against
// Postgres, so it is far slower than a unit test. Jest's 5s default was
// enough locally but not on a CI runner, where these timed out instead of
// failing an assertion. The advisory-lock contention they exercise is
// inherently slow, so the budget is explicit rather than implied.
const CONCURRENCY_TEST_TIMEOUT_MS = 30_000;

/**
 * Counts responses by status and pulls out anything unexpected with its
 * message. Asserting on this instead of on a filtered array means a failure
 * reports WHY -- `{ '429': 10 }` is rate limiting, `{ '409': 10 }` is the
 * guard rejecting everyone, and `unexpected` carries the API's own error text.
 */
function summarise(responses, allowed = [201, 409]) {
  const byStatus = {};
  for (const r of responses) {
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
  }
  const unexpected = responses
    .filter((r) => !allowed.includes(r.status))
    .map((r) => ({ status: r.status, message: r.body?.message }));
  return { byStatus, unexpected };
}

describe('concurrent booking / double-booking prevention', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeAll(async () => {
    await ensureRolesAndPermissions();
  });

  it('exactly one of N simultaneous requests for the same specific room+dates succeeds', async () => {
    const { hotel, rooms } = await createBookableHotel({ roomCount: 1, price: 90 });
    const room = rooms[0];

    const N = 10;
    const customers = await Promise.all(Array.from({ length: N }, () => createCustomerUser()));
    const tokens = await Promise.all(customers.map((c) => login(c.email, c.password)));

    const responses = await Promise.all(
      tokens.map((token) =>
        request(app)
          .post('/api/v1/bookings')
          .set('Authorization', `Bearer ${token}`)
          .send({
            hotelId: hotel.id,
            checkIn: '2028-01-05',
            checkOut: '2028-01-08',
            adults: 1,
            rooms: [{ roomId: room.id }],
            guests: [sampleGuest()],
          })
      )
    );

    const { byStatus, unexpected } = summarise(responses);
    expect(unexpected).toEqual([]);
    expect(byStatus).toEqual({ 201: 1, 409: N - 1 });

    const bookingRoomsForRoom = await prisma.bookingRoom.findMany({
      where: { roomId: room.id, checkIn: new Date('2028-01-05'), checkOut: new Date('2028-01-08') },
    });
    expect(bookingRoomsForRoom).toHaveLength(1);
  }, CONCURRENCY_TEST_TIMEOUT_MS);

  it('exactly `roomCount` of N simultaneous type-based requests succeed, one physical room each', async () => {
    const ROOM_COUNT = 3;
    const { hotel, roomType } = await createBookableHotel({ roomCount: ROOM_COUNT, price: 70 });

    const N = 8;
    const customers = await Promise.all(Array.from({ length: N }, () => createCustomerUser()));
    const tokens = await Promise.all(customers.map((c) => login(c.email, c.password)));

    const responses = await Promise.all(
      tokens.map((token) =>
        request(app)
          .post('/api/v1/bookings')
          .set('Authorization', `Bearer ${token}`)
          .send({
            hotelId: hotel.id,
            checkIn: '2028-02-10',
            checkOut: '2028-02-12',
            adults: 1,
            rooms: [{ roomTypeId: roomType.id }],
            guests: [sampleGuest()],
          })
      )
    );

    const succeeded = responses.filter((r) => r.status === 201);
    const { byStatus, unexpected } = summarise(responses);
    expect(unexpected).toEqual([]);
    expect(byStatus).toEqual({ 201: ROOM_COUNT, 409: N - ROOM_COUNT });

    // Every winner must have been assigned a distinct physical room.
    const assignedRoomIds = new Set(succeeded.map((r) => r.body.data.bookingRooms[0].roomId));
    expect(assignedRoomIds.size).toBe(ROOM_COUNT);
  }, CONCURRENCY_TEST_TIMEOUT_MS);

  it('a cancelled booking releases the room for the same dates', async () => {
    const { hotel, rooms } = await createBookableHotel({ roomCount: 1, price: 50 });
    const room = rooms[0];
    const customer = await createCustomerUser();
    const token = await login(customer.email, customer.password);

    const first = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        hotelId: hotel.id,
        checkIn: '2028-03-01',
        checkOut: '2028-03-03',
        adults: 1,
        rooms: [{ roomId: room.id }],
        guests: [sampleGuest()],
      });
    expect(first.status).toBe(201);

    const blockedSecond = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        hotelId: hotel.id,
        checkIn: '2028-03-01',
        checkOut: '2028-03-03',
        adults: 1,
        rooms: [{ roomId: room.id }],
        guests: [sampleGuest()],
      });
    expect(blockedSecond.status).toBe(409);

    await request(app).post(`/api/v1/bookings/${first.body.data.id}/cancel`).set('Authorization', `Bearer ${token}`).expect(200);

    const afterCancel = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        hotelId: hotel.id,
        checkIn: '2028-03-01',
        checkOut: '2028-03-03',
        adults: 1,
        rooms: [{ roomId: room.id }],
        guests: [sampleGuest()],
      });
    expect(afterCancel.status).toBe(201);
  }, CONCURRENCY_TEST_TIMEOUT_MS);
});
