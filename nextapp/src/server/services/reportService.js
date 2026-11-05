import { and, asc, count, desc, eq, gt, gte, inArray, isNull, lt, lte, notInArray, sum as sqlSum } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  bookingRooms,
  bookings,
  commissions,
  customers,
  destinations,
  hotels,
  payments,
  refunds,
  tourBookings,
  tourPackages,
} from '../db/schema.js';
import { Money, sum } from '../utils/money.js';
import { startOfDay, addDays, toDayKey } from '../utils/dateRange.js';

// Every report function has the signature `(filters, pagination) => { rows, total }`.
// `pagination` is `{ skip, take }` for a UI page, or `undefined` to fetch the
// full filtered dataset (used by the CSV export endpoint).

/**
 * Prisma took a `{ gte, lte }` object; Drizzle takes comparison expressions, so
 * a range becomes zero, one or two clauses on the given column.
 */
function dateRangeClauses(column, dateFrom, dateTo) {
  return [
    dateFrom ? gte(column, new Date(dateFrom)) : null,
    dateTo ? lte(column, new Date(dateTo)) : null,
  ].filter(Boolean);
}

/** `undefined` limit/offset are ignored by Drizzle, which is what an unpaginated export wants. */
function pageArgs(pagination) {
  return { limit: pagination?.take, offset: pagination?.skip };
}

async function countOf(table, where) {
  const [{ value }] = await db.select({ value: count() }).from(table).where(where);
  return Number(value);
}

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------
export async function bookingsReport({ dateFrom, dateTo, hotelId, agentId, bookingSource } = {}, pagination) {
  const filters = [
    hotelId ? eq(bookings.hotelId, hotelId) : null,
    agentId ? eq(bookings.agentId, agentId) : null,
    bookingSource ? eq(bookings.source, bookingSource) : null,
    ...dateRangeClauses(bookings.checkIn, dateFrom, dateTo),
  ].filter(Boolean);
  const where = filters.length ? and(...filters) : undefined;

  const [rows_, total] = await Promise.all([
    db.query.bookings.findMany({
      where,
      with: {
        hotel: { columns: { name: true } },
        customer: { columns: { firstName: true, lastName: true, email: true } },
        agent: { columns: { firstName: true, lastName: true } },
      },
      orderBy: desc(bookings.createdAt),
      ...pageArgs(pagination),
    }),
    countOf(bookings, where),
  ]);

  const rows = rows_.map((b) => ({
    bookingNumber: b.bookingNumber,
    hotelName: b.hotel?.name,
    customerName: `${b.customer?.firstName ?? ''} ${b.customer?.lastName ?? ''}`.trim(),
    customerEmail: b.customer?.email,
    agentName: b.agent ? `${b.agent.firstName} ${b.agent.lastName}` : null,
    checkIn: toDayKey(b.checkIn),
    checkOut: toDayKey(b.checkOut),
    status: b.status,
    source: b.source,
    currency: b.currency,
    totalAmount: new Money(b.totalAmount).toString(),
    paidAmount: new Money(b.paidAmount).toString(),
    dueAmount: new Money(b.dueAmount).toString(),
    createdAt: b.createdAt.toISOString(),
  }));

  return { rows, total };
}

// ---------------------------------------------------------------------------
// Occupancy -- per-hotel booked-room-nights vs. available-room-nights over
// the requested date range (defaults to the last 30 days).
// ---------------------------------------------------------------------------
export async function occupancyReport({ dateFrom, dateTo, hotelId } = {}, pagination) {
  const to = dateTo ? new Date(dateTo) : new Date();
  const from = dateFrom ? new Date(dateFrom) : addDays(startOfDay(to), -29);
  const rangeDays = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86400000));

  const hotelWhere = and(isNull(hotels.deletedAt), ...(hotelId ? [eq(hotels.id, hotelId)] : []));
  const [pageHotels, total] = await Promise.all([
    db.query.hotels.findMany({
      where: hotelWhere,
      columns: { id: true, name: true },
      with: { roomTypes: { columns: { totalRooms: true } } },
      orderBy: asc(hotels.name),
      ...pageArgs(pagination),
    }),
    countOf(hotels, hotelWhere),
  ]);

  if (pageHotels.length === 0) return { rows: [], total };

  // Prisma ran one aggregate per hotel inside the loop. The equivalent here is
  // a single grouped join over the page's hotels, which is both one round trip
  // and the only way to express the relation filter in Drizzle.
  const hotelIds = pageHotels.map((h) => h.id);
  const grouped = await db
    .select({ hotelId: bookings.hotelId, nights: sqlSum(bookingRooms.nights) })
    .from(bookingRooms)
    .innerJoin(bookings, eq(bookingRooms.bookingId, bookings.id))
    .where(
      and(
        inArray(bookings.hotelId, hotelIds),
        notInArray(bookings.status, ['cancelled', 'no_show']),
        lt(bookingRooms.checkIn, to),
        gt(bookingRooms.checkOut, from)
      )
    )
    .groupBy(bookings.hotelId);
  const nightsByHotel = new Map(grouped.map((g) => [g.hotelId, Number(g.nights ?? 0)]));

  const rows = pageHotels.map((hotel) => {
    const totalRooms = hotel.roomTypes.reduce((s, rt) => s + rt.totalRooms, 0);
    const bookedRoomNights = nightsByHotel.get(hotel.id) ?? 0;
    const availableRoomNights = totalRooms * rangeDays;
    const occupancyRatePercent =
      availableRoomNights > 0 ? Math.round((bookedRoomNights / availableRoomNights) * 10000) / 100 : 0;

    return {
      hotelId: hotel.id,
      hotelName: hotel.name,
      totalRooms,
      bookedRoomNights,
      availableRoomNights,
      occupancyRatePercent,
    };
  });

  return { rows, total };
}

// ---------------------------------------------------------------------------
// Revenue -- daily totals of paid payments, optionally scoped to a hotel.
// ---------------------------------------------------------------------------
export async function revenueReport({ dateFrom, dateTo, hotelId } = {}, pagination) {
  const rows_ = await db
    .select({ amount: payments.amount, paidAt: payments.paidAt, createdAt: payments.createdAt })
    .from(payments)
    // `booking: { hotelId }` was a nested relation filter in Prisma; Drizzle
    // needs the join, which is only added when the filter is actually set.
    .innerJoin(bookings, eq(payments.bookingId, bookings.id))
    .where(
      and(
        eq(payments.status, 'paid'),
        ...dateRangeClauses(payments.paidAt, dateFrom, dateTo),
        ...(hotelId ? [eq(bookings.hotelId, hotelId)] : [])
      )
    );

  const byDay = new Map();
  for (const p of rows_) {
    const key = toDayKey(p.paidAt ?? p.createdAt);
    const cur = byDay.get(key) ?? { date: key, revenue: new Money(0), paymentCount: 0 };
    cur.revenue = cur.revenue.plus(new Money(p.amount));
    cur.paymentCount += 1;
    byDay.set(key, cur);
  }

  const allRows = [...byDay.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({ date: r.date, revenue: r.revenue.toString(), paymentCount: r.paymentCount }));

  const total = allRows.length;
  const rows = pagination ? allRows.slice(pagination.skip, pagination.skip + pagination.take) : allRows;

  return { rows, total };
}

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------
export async function customersReport({ dateFrom, dateTo } = {}, pagination) {
  const notDeleted = isNull(customers.deletedAt);
  const bookingRange = dateRangeClauses(bookings.createdAt, dateFrom, dateTo);

  const [rows_, total] = await Promise.all([
    db.query.customers.findMany({
      where: notDeleted,
      columns: { id: true, firstName: true, lastName: true, email: true, phone: true, createdAt: true },
      with: {
        bookings: {
          where: bookingRange.length ? and(...bookingRange) : undefined,
          columns: { totalAmount: true },
        },
      },
      orderBy: desc(customers.createdAt),
      ...pageArgs(pagination),
    }),
    countOf(customers, notDeleted),
  ]);

  const rows = rows_.map((c) => ({
    customerId: c.id,
    name: `${c.firstName} ${c.lastName}`,
    email: c.email,
    phone: c.phone,
    totalBookings: c.bookings.length,
    totalSpent: sum(c.bookings.map((b) => b.totalAmount)).toString(),
    joinedAt: c.createdAt.toISOString(),
  }));

  return { rows, total };
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------
export async function paymentsReport({ dateFrom, dateTo, hotelId, paymentMethod } = {}, pagination) {
  // The hotel filter lives on the booking, so it narrows to a set of booking
  // ids first -- Drizzle's relational query cannot filter a row by its parent.
  const hotelBookingIds = hotelId ? await bookingIdsForHotel(hotelId) : null;
  if (hotelBookingIds && hotelBookingIds.length === 0) return { rows: [], total: 0 };

  const filters = [
    paymentMethod ? eq(payments.method, paymentMethod) : null,
    hotelBookingIds ? inArray(payments.bookingId, hotelBookingIds) : null,
    ...dateRangeClauses(payments.createdAt, dateFrom, dateTo),
  ].filter(Boolean);
  const where = filters.length ? and(...filters) : undefined;

  const [rows_, total] = await Promise.all([
    db.query.payments.findMany({
      where,
      with: {
        booking: { columns: { bookingNumber: true }, with: { hotel: { columns: { name: true } } } },
      },
      orderBy: desc(payments.createdAt),
      ...pageArgs(pagination),
    }),
    countOf(payments, where),
  ]);

  const rows = rows_.map((p) => ({
    paymentId: p.id,
    bookingNumber: p.booking?.bookingNumber,
    hotelName: p.booking?.hotel?.name,
    amount: new Money(p.amount).toString(),
    currency: p.currency,
    method: p.method,
    status: p.status,
    transactionId: p.transactionId,
    paidAt: p.paidAt ? p.paidAt.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
  }));

  return { rows, total };
}

async function bookingIdsForHotel(hotelId) {
  const rows = await db.select({ id: bookings.id }).from(bookings).where(eq(bookings.hotelId, hotelId));
  return rows.map((r) => r.id);
}

// ---------------------------------------------------------------------------
// Refunds
// ---------------------------------------------------------------------------
export async function refundsReport({ dateFrom, dateTo, hotelId } = {}, pagination) {
  // Two levels up (refund -> payment -> booking), so the hotel filter narrows
  // to a set of payment ids.
  let hotelPaymentIds = null;
  if (hotelId) {
    const rows = await db
      .select({ id: payments.id })
      .from(payments)
      .innerJoin(bookings, eq(payments.bookingId, bookings.id))
      .where(eq(bookings.hotelId, hotelId));
    hotelPaymentIds = rows.map((r) => r.id);
    if (hotelPaymentIds.length === 0) return { rows: [], total: 0 };
  }

  const filters = [
    hotelPaymentIds ? inArray(refunds.paymentId, hotelPaymentIds) : null,
    ...dateRangeClauses(refunds.createdAt, dateFrom, dateTo),
  ].filter(Boolean);
  const where = filters.length ? and(...filters) : undefined;

  const [rows_, total] = await Promise.all([
    db.query.refunds.findMany({
      where,
      with: {
        payment: {
          with: { booking: { columns: { bookingNumber: true }, with: { hotel: { columns: { name: true } } } } },
        },
      },
      orderBy: desc(refunds.createdAt),
      ...pageArgs(pagination),
    }),
    countOf(refunds, where),
  ]);

  const rows = rows_.map((r) => ({
    refundId: r.id,
    bookingNumber: r.payment?.booking?.bookingNumber,
    hotelName: r.payment?.booking?.hotel?.name,
    amount: new Money(r.amount).toString(),
    status: r.status,
    reason: r.reason,
    processedAt: r.processedAt ? r.processedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  }));

  return { rows, total };
}

// ---------------------------------------------------------------------------
// Commissions
// ---------------------------------------------------------------------------
export async function commissionsReport({ dateFrom, dateTo, agentId } = {}, pagination) {
  const filters = [
    agentId ? eq(commissions.agentId, agentId) : null,
    ...dateRangeClauses(commissions.createdAt, dateFrom, dateTo),
  ].filter(Boolean);
  const where = filters.length ? and(...filters) : undefined;

  const [rows_, total] = await Promise.all([
    db.query.commissions.findMany({
      where,
      with: {
        agent: { columns: { firstName: true, lastName: true, email: true } },
        booking: { columns: { bookingNumber: true }, with: { hotel: { columns: { name: true } } } },
      },
      orderBy: desc(commissions.createdAt),
      ...pageArgs(pagination),
    }),
    countOf(commissions, where),
  ]);

  const rows = rows_.map((c) => ({
    commissionId: c.id,
    agentName: `${c.agent.firstName} ${c.agent.lastName}`,
    agentEmail: c.agent.email,
    bookingNumber: c.booking?.bookingNumber,
    hotelName: c.booking?.hotel?.name,
    percentage: c.percentage.toString(),
    amount: new Money(c.amount).toString(),
    status: c.status,
    paidAt: c.paidAt ? c.paidAt.toISOString() : null,
    createdAt: c.createdAt.toISOString(),
  }));

  return { rows, total };
}

// ---------------------------------------------------------------------------
// Hotels -- per-hotel booking count + revenue.
// ---------------------------------------------------------------------------
export async function hotelsReport({ dateFrom, dateTo } = {}, pagination) {
  const notDeleted = isNull(hotels.deletedAt);

  const [pageHotels, total] = await Promise.all([
    db.query.hotels.findMany({
      where: notDeleted,
      columns: { id: true, name: true, city: true, country: true, status: true },
      orderBy: asc(hotels.name),
      ...pageArgs(pagination),
    }),
    countOf(hotels, notDeleted),
  ]);

  if (pageHotels.length === 0) return { rows: [], total };

  // Prisma's groupBy with _count/_sum; the Drizzle equivalent is an explicit
  // grouped select.
  const grouped = await db
    .select({
      hotelId: bookings.hotelId,
      bookingCount: count(),
      revenue: sqlSum(bookings.totalAmount),
    })
    .from(bookings)
    .where(
      and(
        inArray(bookings.hotelId, pageHotels.map((h) => h.id)),
        ...dateRangeClauses(bookings.createdAt, dateFrom, dateTo)
      )
    )
    .groupBy(bookings.hotelId);
  const statsByHotel = new Map(grouped.map((g) => [g.hotelId, g]));

  const rows = pageHotels.map((h) => {
    const stats = statsByHotel.get(h.id);
    return {
      hotelId: h.id,
      name: h.name,
      city: h.city,
      country: h.country,
      status: h.status,
      totalBookings: Number(stats?.bookingCount ?? 0),
      totalRevenue: new Money(stats?.revenue ?? 0).toString(),
    };
  });

  return { rows, total };
}

// ---------------------------------------------------------------------------
// Tours -- per-tour-package booking count + revenue.
// ---------------------------------------------------------------------------
export async function toursReport({ dateFrom, dateTo } = {}, pagination) {
  const notDeleted = isNull(tourPackages.deletedAt);

  const [tours, total] = await Promise.all([
    db.query.tourPackages.findMany({
      where: notDeleted,
      columns: { id: true, name: true, price: true, status: true },
      with: { destination: { columns: { name: true } } },
      orderBy: asc(tourPackages.name),
      ...pageArgs(pagination),
    }),
    countOf(tourPackages, notDeleted),
  ]);

  if (tours.length === 0) return { rows: [], total };

  const grouped = await groupTourBookings(tours.map((t) => t.id), dateFrom, dateTo);
  const statsByTour = new Map(grouped.map((g) => [g.tourPackageId, g]));

  const rows = tours.map((t) => {
    const stats = statsByTour.get(t.id);
    return {
      tourId: t.id,
      name: t.name,
      destination: t.destination?.name,
      price: new Money(t.price).toString(),
      status: t.status,
      totalBookings: Number(stats?.bookingCount ?? 0),
      totalRevenue: new Money(stats?.revenue ?? 0).toString(),
    };
  });

  return { rows, total };
}

async function groupTourBookings(tourPackageIds, dateFrom, dateTo) {
  if (tourPackageIds.length === 0) return [];
  return db
    .select({
      tourPackageId: tourBookings.tourPackageId,
      bookingCount: count(),
      revenue: sqlSum(tourBookings.totalAmount),
    })
    .from(tourBookings)
    .where(
      and(
        inArray(tourBookings.tourPackageId, tourPackageIds),
        ...dateRangeClauses(tourBookings.createdAt, dateFrom, dateTo)
      )
    )
    .groupBy(tourBookings.tourPackageId);
}

// ---------------------------------------------------------------------------
// Destinations -- per-destination tour-booking count + revenue (aggregated
// two levels down through TourPackage since TourBooking has no destinationId).
// ---------------------------------------------------------------------------
export async function destinationsReport({ dateFrom, dateTo } = {}, pagination) {
  const notDeleted = isNull(destinations.deletedAt);

  const [pageDestinations, total] = await Promise.all([
    db.query.destinations.findMany({
      where: notDeleted,
      columns: { id: true, name: true, country: true, status: true },
      orderBy: asc(destinations.name),
      ...pageArgs(pagination),
    }),
    countOf(destinations, notDeleted),
  ]);

  if (pageDestinations.length === 0) return { rows: [], total };

  const packages = await db
    .select({ id: tourPackages.id, destinationId: tourPackages.destinationId })
    .from(tourPackages)
    .where(inArray(tourPackages.destinationId, pageDestinations.map((d) => d.id)));
  const destinationByTourPackage = new Map(packages.map((tp) => [tp.id, tp.destinationId]));

  const grouped = await groupTourBookings(packages.map((tp) => tp.id), dateFrom, dateTo);

  const statsByDestination = new Map();
  for (const g of grouped) {
    const destinationId = destinationByTourPackage.get(g.tourPackageId);
    if (!destinationId) continue;
    const cur = statsByDestination.get(destinationId) ?? { count: 0, revenue: new Money(0) };
    cur.count += Number(g.bookingCount);
    cur.revenue = cur.revenue.plus(new Money(g.revenue ?? 0));
    statsByDestination.set(destinationId, cur);
  }

  const rows = pageDestinations.map((d) => {
    const stats = statsByDestination.get(d.id);
    return {
      destinationId: d.id,
      name: d.name,
      country: d.country,
      status: d.status,
      totalTourBookings: stats?.count ?? 0,
      totalRevenue: (stats?.revenue ?? new Money(0)).toString(),
    };
  });

  return { rows, total };
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------
const REPORTS = {
  bookings: bookingsReport,
  occupancy: occupancyReport,
  revenue: revenueReport,
  customers: customersReport,
  payments: paymentsReport,
  refunds: refundsReport,
  commissions: commissionsReport,
  hotels: hotelsReport,
  tours: toursReport,
  destinations: destinationsReport,
};

export const REPORT_NAMES = Object.keys(REPORTS);

export function getReportRunner(reportName) {
  return REPORTS[reportName];
}
