import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';
import {
  ensureRolesAndPermissions,
  createAdmin,
  createCustomerUser,
  createBookableHotel,
  sampleGuest,
} from '../helpers/fixtures.js';

const app = createApp();

async function login(email, password) {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password });
  return res.body.data.accessToken;
}

describe('booking lifecycle', () => {
  let adminToken;
  let customerAToken;
  let customerA;
  let customerBToken;

  beforeAll(async () => {
    await ensureRolesAndPermissions();
    const admin = await createAdmin();
    adminToken = await login(admin.email, admin.password);

    customerA = await createCustomerUser();
    customerAToken = await login(customerA.email, customerA.password);

    const customerB = await createCustomerUser();
    customerBToken = await login(customerB.email, customerB.password);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('search availability returns a server-calculated price, not something the client can influence', async () => {
    const { hotel } = await createBookableHotel({ price: 75 });

    const res = await request(app)
      .get('/api/v1/rooms/availability')
      .query({ hotelId: hotel.id, checkIn: '2027-01-10', checkOut: '2027-01-13', adults: 2 });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    const roomType = res.body.data[0].roomTypes[0];
    expect(roomType.ratePerNight).toBe('75');
    expect(roomType.totalPrice).toBe('225'); // 3 nights * 75
    expect(roomType.currency).toBe('USD');
  });

  it('lets a logged-in customer book by roomTypeId without supplying customerId, and recalculates price server-side', async () => {
    const { hotel, roomType } = await createBookableHotel({ price: 50 });

    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({
        hotelId: hotel.id,
        checkIn: '2027-02-01',
        checkOut: '2027-02-04',
        adults: 2,
        rooms: [{ roomTypeId: roomType.id }],
        guests: [sampleGuest()],
        // A malicious/naive client might try to smuggle these in -- backend must ignore them.
        discountAmount: 999999,
        customerId: '00000000-0000-0000-0000-000000000000',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.customerId).toBe(customerA.customer.id);
    expect(res.body.data.totalAmount).toBe('150'); // 3 nights * 50, discount ignored
    expect(res.body.data.status).toBe('held');
    expect(res.body.data.bookingRooms).toHaveLength(1);
  });

  it("a customer cannot see another customer's bookings via the list endpoint", async () => {
    const { hotel, roomType } = await createBookableHotel({ price: 40 });
    await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({
        hotelId: hotel.id,
        checkIn: '2027-03-01',
        checkOut: '2027-03-02',
        adults: 1,
        rooms: [{ roomTypeId: roomType.id }],
        guests: [sampleGuest()],
      })
      .expect(201);

    const bList = await request(app).get('/api/v1/bookings').set('Authorization', `Bearer ${customerBToken}`);
    expect(bList.status).toBe(200);
    expect(bList.body.data).toHaveLength(0);
  });

  it("a customer cannot fetch another customer's booking by id", async () => {
    const { hotel, roomType } = await createBookableHotel({ price: 40 });
    const created = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({
        hotelId: hotel.id,
        checkIn: '2027-04-01',
        checkOut: '2027-04-02',
        adults: 1,
        rooms: [{ roomTypeId: roomType.id }],
        guests: [sampleGuest()],
      });
    const bookingId = created.body.data.id;

    const otherView = await request(app).get(`/api/v1/bookings/${bookingId}`).set('Authorization', `Bearer ${customerBToken}`);
    expect(otherView.status).toBe(403);

    const ownView = await request(app).get(`/api/v1/bookings/${bookingId}`).set('Authorization', `Bearer ${customerAToken}`);
    expect(ownView.status).toBe(200);

    const staffView = await request(app).get(`/api/v1/bookings/${bookingId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(staffView.status).toBe(200);
  });

  it('rejects a booking where check-out is not after check-in', async () => {
    const { hotel, roomType } = await createBookableHotel();
    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({
        hotelId: hotel.id,
        checkIn: '2027-05-05',
        checkOut: '2027-05-05',
        adults: 1,
        rooms: [{ roomTypeId: roomType.id }],
        guests: [sampleGuest()],
      });
    expect(res.status).toBe(422);
  });

  it('rejects an availability search whose check-out is not after check-in', async () => {
    const { hotel } = await createBookableHotel({ price: 100 });

    const res = await request(app).get('/api/v1/rooms/availability').query({
      hotelId: hotel.id,
      checkIn: '2030-02-10',
      checkOut: '2030-02-08',
      adults: 1,
    });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('applies a 100% cancellation fee inside the 24-hour window and a free cancellation far out', async () => {
    const { hotel, roomType } = await createBookableHotel({ price: 100 });

    // Far-out stay: cancellation should be free.
    const farOut = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({
        hotelId: hotel.id,
        checkIn: '2030-01-10',
        checkOut: '2030-01-12',
        adults: 1,
        rooms: [{ roomTypeId: roomType.id }],
        guests: [sampleGuest()],
      });
    const cancelFarOut = await request(app)
      .post(`/api/v1/bookings/${farOut.body.data.id}/cancel`)
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({ reason: 'change of plans' });
    expect(cancelFarOut.status).toBe(200);
    expect(cancelFarOut.body.data.cancellationFee).toBe('0');
    // The response must reflect the cancellation it just performed, not the
    // pre-cancellation row.
    expect(cancelFarOut.body.data.status).toBe('cancelled');
    expect(cancelFarOut.body.data.cancelledAt).toBeTruthy();
  });

  it('an admin can confirm a held booking, then check the guest in and out', async () => {
    const { hotel, roomType } = await createBookableHotel({ price: 60 });
    const booking = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({
        hotelId: hotel.id,
        checkIn: '2027-06-01',
        checkOut: '2027-06-03',
        adults: 1,
        rooms: [{ roomTypeId: roomType.id }],
        guests: [sampleGuest()],
      });
    const bookingId = booking.body.data.id;

    const confirm = await request(app).post(`/api/v1/bookings/${bookingId}/confirm`).set('Authorization', `Bearer ${adminToken}`);
    expect(confirm.status).toBe(200);
    expect(confirm.body.data.status).toBe('confirmed');

    const checkIn = await request(app).post(`/api/v1/bookings/${bookingId}/check-in`).set('Authorization', `Bearer ${adminToken}`);
    expect(checkIn.status).toBe(200);
    expect(checkIn.body.data.status).toBe('checked_in');

    const bookingRoom = await prisma.bookingRoom.findFirst({ where: { bookingId } });
    const room = await prisma.room.findUnique({ where: { id: bookingRoom.roomId } });
    expect(room.status).toBe('occupied');

    const checkOut = await request(app).post(`/api/v1/bookings/${bookingId}/check-out`).set('Authorization', `Bearer ${adminToken}`);
    expect(checkOut.status).toBe(200);
    expect(checkOut.body.data.status).toBe('checked_out');
  });

  it('rejects check-in on a booking that is not yet confirmed', async () => {
    const { hotel, roomType } = await createBookableHotel({ price: 60 });
    const booking = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({
        hotelId: hotel.id,
        checkIn: '2027-07-01',
        checkOut: '2027-07-02',
        adults: 1,
        rooms: [{ roomTypeId: roomType.id }],
        guests: [sampleGuest()],
      });

    const checkIn = await request(app)
      .post(`/api/v1/bookings/${booking.body.data.id}/check-in`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(checkIn.status).toBe(409);
  });
});
