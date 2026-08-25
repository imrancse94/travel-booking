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

async function createHeldBooking(token, { hotelId, roomTypeId }) {
  const res = await request(app)
    .post('/api/v1/bookings')
    .set('Authorization', `Bearer ${token}`)
    .send({
      hotelId,
      checkIn: '2029-01-10',
      checkOut: '2029-01-12',
      adults: 1,
      rooms: [{ roomTypeId }],
      guests: [sampleGuest()],
    });
  return res.body.data;
}

describe('payments and invoices', () => {
  let adminToken;
  let customerA, customerAToken;
  let customerB, customerBToken;

  beforeAll(async () => {
    await ensureRolesAndPermissions();
    const admin = await createAdmin();
    adminToken = await login(admin.email, admin.password);

    customerA = await createCustomerUser();
    customerAToken = await login(customerA.email, customerA.password);
    customerB = await createCustomerUser();
    customerBToken = await login(customerB.email, customerB.password);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('lets a customer pay toward their own booking with the mock gateway', async () => {
    const { hotel, roomType } = await createBookableHotel({ price: 80 });
    const booking = await createHeldBooking(customerAToken, { hotelId: hotel.id, roomTypeId: roomType.id });

    const pay = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({ bookingId: booking.id, amount: Number(booking.totalAmount), method: 'card', gateway: 'mock' });

    expect(pay.status).toBe(201);
    expect(pay.body.data.status).toBe('paid');
    expect(pay.body.data.bookingId ?? pay.body.data.booking?.id).toBeTruthy();
  });

  it("blocks a customer from paying toward another customer's booking (404, not 403 -- doesn't confirm it exists)", async () => {
    const { hotel, roomType } = await createBookableHotel({ price: 80 });
    const booking = await createHeldBooking(customerAToken, { hotelId: hotel.id, roomTypeId: roomType.id });

    const pay = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${customerBToken}`)
      .send({ bookingId: booking.id, amount: Number(booking.totalAmount), method: 'card', gateway: 'mock' });

    expect(pay.status).toBe(404);
  });

  it("excludes another customer's payments from a customer's own payment list", async () => {
    const { hotel, roomType } = await createBookableHotel({ price: 30 });
    const booking = await createHeldBooking(customerAToken, { hotelId: hotel.id, roomTypeId: roomType.id });
    await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({ bookingId: booking.id, amount: Number(booking.totalAmount), method: 'cash', gateway: 'mock' })
      .expect(201);

    const bList = await request(app).get('/api/v1/payments').set('Authorization', `Bearer ${customerBToken}`);
    expect(bList.status).toBe(200);
    expect(bList.body.data).toHaveLength(0);

    const aList = await request(app).get('/api/v1/payments').set('Authorization', `Bearer ${customerAToken}`);
    expect(aList.status).toBe(200);
    expect(aList.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it("blocks a customer from viewing another customer's payment by id", async () => {
    const { hotel, roomType } = await createBookableHotel({ price: 30 });
    const booking = await createHeldBooking(customerAToken, { hotelId: hotel.id, roomTypeId: roomType.id });
    const pay = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({ bookingId: booking.id, amount: Number(booking.totalAmount), method: 'cash', gateway: 'mock' });

    const other = await request(app).get(`/api/v1/payments/${pay.body.data.id}`).set('Authorization', `Bearer ${customerBToken}`);
    expect(other.status).toBe(403);

    const own = await request(app).get(`/api/v1/payments/${pay.body.data.id}`).set('Authorization', `Bearer ${customerAToken}`);
    expect(own.status).toBe(200);
  });

  it('staff generates an invoice for a paid booking, and only the owning customer can view/download it', async () => {
    const { hotel, roomType } = await createBookableHotel({ price: 45 });
    const booking = await createHeldBooking(customerAToken, { hotelId: hotel.id, roomTypeId: roomType.id });
    await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({ bookingId: booking.id, amount: Number(booking.totalAmount), method: 'card', gateway: 'mock' })
      .expect(201);

    const invoice = await request(app)
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ bookingId: booking.id });
    expect(invoice.status).toBe(201);
    const invoiceId = invoice.body.data.id;

    const otherView = await request(app).get(`/api/v1/invoices/${invoiceId}`).set('Authorization', `Bearer ${customerBToken}`);
    expect(otherView.status).toBe(403);

    const ownView = await request(app).get(`/api/v1/invoices/${invoiceId}`).set('Authorization', `Bearer ${customerAToken}`);
    expect(ownView.status).toBe(200);

    const otherPdf = await request(app).get(`/api/v1/invoices/${invoiceId}/pdf`).set('Authorization', `Bearer ${customerBToken}`);
    expect(otherPdf.status).toBe(403);

    const ownPdf = await request(app).get(`/api/v1/invoices/${invoiceId}/pdf`).set('Authorization', `Bearer ${customerAToken}`);
    expect(ownPdf.status).toBe(200);
    expect(ownPdf.headers['content-type']).toBe('application/pdf');
  });

  it('a customer cannot generate invoices directly (no invoices.create permission)', async () => {
    const { hotel, roomType } = await createBookableHotel({ price: 45 });
    const booking = await createHeldBooking(customerAToken, { hotelId: hotel.id, roomTypeId: roomType.id });

    const res = await request(app)
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({ bookingId: booking.id });
    expect(res.status).toBe(403);
  });
});
