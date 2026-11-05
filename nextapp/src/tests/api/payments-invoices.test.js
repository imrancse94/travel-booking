// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { ensureRolesAndPermissions, createAdmin, createCustomerUser, createBookableHotel, sampleGuest } from '../helpers/fixtures.js';
import { callRoute, bearer } from '../helpers/callRoute.js';

import { POST as login } from '../../app/api/v1/auth/login/route.js';
import { POST as createBooking } from '../../app/api/v1/bookings/route.js';
import { POST as createPayment, GET as listPayments } from '../../app/api/v1/payments/route.js';
import { GET as getPayment } from '../../app/api/v1/payments/[id]/route.js';
import { POST as createInvoice } from '../../app/api/v1/invoices/route.js';
import { GET as getInvoice } from '../../app/api/v1/invoices/[id]/route.js';
import { GET as getInvoicePdf } from '../../app/api/v1/invoices/[id]/pdf/route.js';

async function login_(email, password) {
  const res = await callRoute(login, { method: 'POST', path: '/api/v1/auth/login', body: { email, password } });
  return res.body.data.accessToken;
}

async function createHeldBooking(token, { hotelId, roomTypeId }) {
  const res = await callRoute(createBooking, {
    method: 'POST',
    path: '/api/v1/bookings',
    headers: bearer(token),
    body: {
      hotelId,
      checkIn: '2029-01-10',
      checkOut: '2029-01-12',
      adults: 1,
      rooms: [{ roomTypeId }],
      guests: [sampleGuest()],
    },
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
    adminToken = await login_(admin.email, admin.password);

    customerA = await createCustomerUser();
    customerAToken = await login_(customerA.email, customerA.password);
    customerB = await createCustomerUser();
    customerBToken = await login_(customerB.email, customerB.password);
  });

  it('lets a customer pay toward their own booking with the mock gateway', async () => {
    const { hotel, roomType } = await createBookableHotel({ price: 80 });
    const booking = await createHeldBooking(customerAToken, { hotelId: hotel.id, roomTypeId: roomType.id });

    const pay = await callRoute(createPayment, {
      method: 'POST',
      path: '/api/v1/payments',
      headers: bearer(customerAToken),
      body: { bookingId: booking.id, amount: Number(booking.totalAmount), method: 'card', gateway: 'mock' },
    });

    expect(pay.status).toBe(201);
    expect(pay.body.data.status).toBe('paid');
    expect(pay.body.data.bookingId ?? pay.body.data.booking?.id).toBeTruthy();
  });

  it("blocks a customer from paying toward another customer's booking (404, not 403 -- doesn't confirm it exists)", async () => {
    const { hotel, roomType } = await createBookableHotel({ price: 80 });
    const booking = await createHeldBooking(customerAToken, { hotelId: hotel.id, roomTypeId: roomType.id });

    const pay = await callRoute(createPayment, {
      method: 'POST',
      path: '/api/v1/payments',
      headers: bearer(customerBToken),
      body: { bookingId: booking.id, amount: Number(booking.totalAmount), method: 'card', gateway: 'mock' },
    });

    expect(pay.status).toBe(404);
  });

  it("excludes another customer's payments from a customer's own payment list", async () => {
    const { hotel, roomType } = await createBookableHotel({ price: 30 });
    const booking = await createHeldBooking(customerAToken, { hotelId: hotel.id, roomTypeId: roomType.id });
    const paid = await callRoute(createPayment, {
      method: 'POST',
      path: '/api/v1/payments',
      headers: bearer(customerAToken),
      body: { bookingId: booking.id, amount: Number(booking.totalAmount), method: 'cash', gateway: 'mock' },
    });
    expect(paid.status).toBe(201);

    const bList = await callRoute(listPayments, { method: 'GET', path: '/api/v1/payments', headers: bearer(customerBToken) });
    expect(bList.status).toBe(200);
    expect(bList.body.data).toHaveLength(0);

    const aList = await callRoute(listPayments, { method: 'GET', path: '/api/v1/payments', headers: bearer(customerAToken) });
    expect(aList.status).toBe(200);
    expect(aList.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it("blocks a customer from viewing another customer's payment by id", async () => {
    const { hotel, roomType } = await createBookableHotel({ price: 30 });
    const booking = await createHeldBooking(customerAToken, { hotelId: hotel.id, roomTypeId: roomType.id });
    const pay = await callRoute(createPayment, {
      method: 'POST',
      path: '/api/v1/payments',
      headers: bearer(customerAToken),
      body: { bookingId: booking.id, amount: Number(booking.totalAmount), method: 'cash', gateway: 'mock' },
    });

    const other = await callRoute(getPayment, {
      method: 'GET',
      path: `/api/v1/payments/${pay.body.data.id}`,
      headers: bearer(customerBToken),
      routeParams: { id: pay.body.data.id },
    });
    expect(other.status).toBe(403);

    const own = await callRoute(getPayment, {
      method: 'GET',
      path: `/api/v1/payments/${pay.body.data.id}`,
      headers: bearer(customerAToken),
      routeParams: { id: pay.body.data.id },
    });
    expect(own.status).toBe(200);
  });

  it('staff generates an invoice for a paid booking, and only the owning customer can view/download it', async () => {
    const { hotel, roomType } = await createBookableHotel({ price: 45 });
    const booking = await createHeldBooking(customerAToken, { hotelId: hotel.id, roomTypeId: roomType.id });
    const paid = await callRoute(createPayment, {
      method: 'POST',
      path: '/api/v1/payments',
      headers: bearer(customerAToken),
      body: { bookingId: booking.id, amount: Number(booking.totalAmount), method: 'card', gateway: 'mock' },
    });
    expect(paid.status).toBe(201);

    const invoice = await callRoute(createInvoice, {
      method: 'POST',
      path: '/api/v1/invoices',
      headers: bearer(adminToken),
      body: { bookingId: booking.id },
    });
    expect(invoice.status).toBe(201);
    const invoiceId = invoice.body.data.id;

    const otherView = await callRoute(getInvoice, {
      method: 'GET',
      path: `/api/v1/invoices/${invoiceId}`,
      headers: bearer(customerBToken),
      routeParams: { id: invoiceId },
    });
    expect(otherView.status).toBe(403);

    const ownView = await callRoute(getInvoice, {
      method: 'GET',
      path: `/api/v1/invoices/${invoiceId}`,
      headers: bearer(customerAToken),
      routeParams: { id: invoiceId },
    });
    expect(ownView.status).toBe(200);

    const otherPdf = await callRoute(getInvoicePdf, {
      method: 'GET',
      path: `/api/v1/invoices/${invoiceId}/pdf`,
      headers: bearer(customerBToken),
      routeParams: { id: invoiceId },
    });
    expect(otherPdf.status).toBe(403);

    const ownPdf = await callRoute(getInvoicePdf, {
      method: 'GET',
      path: `/api/v1/invoices/${invoiceId}/pdf`,
      headers: bearer(customerAToken),
      routeParams: { id: invoiceId },
    });
    expect(ownPdf.status).toBe(200);
    expect(ownPdf.headers.get('content-type')).toBe('application/pdf');

    // getInvoicePdf writes the PDF to disk only to build the download
    // response; the route handler deletes it (and clears pdfUrl) right after
    // serving the buffer, so nothing lingers on the server past the download.
    const stored = await callRoute(getInvoice, {
      method: 'GET',
      path: `/api/v1/invoices/${invoiceId}`,
      headers: bearer(customerAToken),
      routeParams: { id: invoiceId },
    });
    expect(stored.body.data.pdfUrl).toBeNull();

    // A second download must still work -- the PDF is rendered fresh each
    // time from the invoice/settings data, not served from the deleted file.
    const secondPdf = await callRoute(getInvoicePdf, {
      method: 'GET',
      path: `/api/v1/invoices/${invoiceId}/pdf`,
      headers: bearer(customerAToken),
      routeParams: { id: invoiceId },
    });
    expect(secondPdf.status).toBe(200);
    expect(secondPdf.headers.get('content-type')).toBe('application/pdf');
  });

  it('a customer cannot generate invoices directly (no invoices.create permission)', async () => {
    const { hotel, roomType } = await createBookableHotel({ price: 45 });
    const booking = await createHeldBooking(customerAToken, { hotelId: hotel.id, roomTypeId: roomType.id });

    const res = await callRoute(createInvoice, {
      method: 'POST',
      path: '/api/v1/invoices',
      headers: bearer(customerAToken),
      body: { bookingId: booking.id },
    });
    expect(res.status).toBe(403);
  });
});
