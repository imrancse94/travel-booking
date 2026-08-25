import { prisma } from '../config/prisma.js';
import { Money, sum } from '../utils/money.js';
import { startOfDay, addDays, toDayKey } from '../utils/dateRange.js';

// Every report function has the signature `(filters, pagination) => { rows, total }`.
// `pagination` is `{ skip, take }` for a UI page, or `undefined` to fetch the
// full filtered dataset (used by the CSV export endpoint).

function dateRangeFilter(dateFrom, dateTo) {
  if (!dateFrom && !dateTo) return undefined;
  return {
    ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
    ...(dateTo ? { lte: new Date(dateTo) } : {}),
  };
}

function pageArgs(pagination) {
  return pagination ? { skip: pagination.skip, take: pagination.take } : {};
}

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------
export async function bookingsReport({ dateFrom, dateTo, hotelId, agentId, bookingSource } = {}, pagination) {
  const checkInFilter = dateRangeFilter(dateFrom, dateTo);
  const where = {
    ...(hotelId ? { hotelId } : {}),
    ...(agentId ? { agentId } : {}),
    ...(bookingSource ? { source: bookingSource } : {}),
    ...(checkInFilter ? { checkIn: checkInFilter } : {}),
  };

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        hotel: { select: { name: true } },
        customer: { select: { firstName: true, lastName: true, email: true } },
        agent: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      ...pageArgs(pagination),
    }),
    prisma.booking.count({ where }),
  ]);

  const rows = bookings.map((b) => ({
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

  const hotelWhere = { deletedAt: null, ...(hotelId ? { id: hotelId } : {}) };
  const [hotels, total] = await Promise.all([
    prisma.hotel.findMany({
      where: hotelWhere,
      select: { id: true, name: true, roomTypes: { select: { totalRooms: true } } },
      orderBy: { name: 'asc' },
      ...pageArgs(pagination),
    }),
    prisma.hotel.count({ where: hotelWhere }),
  ]);

  const rows = [];
  for (const hotel of hotels) {
    const totalRooms = hotel.roomTypes.reduce((s, rt) => s + rt.totalRooms, 0);
    // eslint-disable-next-line no-await-in-loop -- small, page-bounded list of hotels
    const agg = await prisma.bookingRoom.aggregate({
      where: {
        booking: { hotelId: hotel.id, status: { notIn: ['cancelled', 'no_show'] } },
        checkIn: { lt: to },
        checkOut: { gt: from },
      },
      _sum: { nights: true },
    });
    const bookedRoomNights = agg._sum.nights ?? 0;
    const availableRoomNights = totalRooms * rangeDays;
    const occupancyRatePercent =
      availableRoomNights > 0 ? Math.round((bookedRoomNights / availableRoomNights) * 10000) / 100 : 0;

    rows.push({
      hotelId: hotel.id,
      hotelName: hotel.name,
      totalRooms,
      bookedRoomNights,
      availableRoomNights,
      occupancyRatePercent,
    });
  }

  return { rows, total };
}

// ---------------------------------------------------------------------------
// Revenue -- daily totals of paid payments, optionally scoped to a hotel.
// ---------------------------------------------------------------------------
export async function revenueReport({ dateFrom, dateTo, hotelId } = {}, pagination) {
  const paidAtFilter = dateRangeFilter(dateFrom, dateTo);
  const payments = await prisma.payment.findMany({
    where: {
      status: 'paid',
      ...(paidAtFilter ? { paidAt: paidAtFilter } : {}),
      ...(hotelId ? { booking: { hotelId } } : {}),
    },
    select: { amount: true, paidAt: true, createdAt: true },
  });

  const byDay = new Map();
  for (const p of payments) {
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
  const bookingCreatedFilter = dateRangeFilter(dateFrom, dateTo);

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        createdAt: true,
        bookings: {
          where: bookingCreatedFilter ? { createdAt: bookingCreatedFilter } : undefined,
          select: { totalAmount: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      ...pageArgs(pagination),
    }),
    prisma.customer.count({ where: { deletedAt: null } }),
  ]);

  const rows = customers.map((c) => ({
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
  const createdFilter = dateRangeFilter(dateFrom, dateTo);
  const where = {
    ...(paymentMethod ? { method: paymentMethod } : {}),
    ...(hotelId ? { booking: { hotelId } } : {}),
    ...(createdFilter ? { createdAt: createdFilter } : {}),
  };

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: { booking: { select: { bookingNumber: true, hotel: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' },
      ...pageArgs(pagination),
    }),
    prisma.payment.count({ where }),
  ]);

  const rows = payments.map((p) => ({
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

// ---------------------------------------------------------------------------
// Refunds
// ---------------------------------------------------------------------------
export async function refundsReport({ dateFrom, dateTo, hotelId } = {}, pagination) {
  const createdFilter = dateRangeFilter(dateFrom, dateTo);
  const where = {
    ...(hotelId ? { payment: { booking: { hotelId } } } : {}),
    ...(createdFilter ? { createdAt: createdFilter } : {}),
  };

  const [refunds, total] = await Promise.all([
    prisma.refund.findMany({
      where,
      include: { payment: { include: { booking: { select: { bookingNumber: true, hotel: { select: { name: true } } } } } } },
      orderBy: { createdAt: 'desc' },
      ...pageArgs(pagination),
    }),
    prisma.refund.count({ where }),
  ]);

  const rows = refunds.map((r) => ({
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
  const createdFilter = dateRangeFilter(dateFrom, dateTo);
  const where = {
    ...(agentId ? { agentId } : {}),
    ...(createdFilter ? { createdAt: createdFilter } : {}),
  };

  const [commissions, total] = await Promise.all([
    prisma.commission.findMany({
      where,
      include: {
        agent: { select: { firstName: true, lastName: true, email: true } },
        booking: { select: { bookingNumber: true, hotel: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      ...pageArgs(pagination),
    }),
    prisma.commission.count({ where }),
  ]);

  const rows = commissions.map((c) => ({
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
  const bookingCreatedFilter = dateRangeFilter(dateFrom, dateTo);

  const [hotels, total] = await Promise.all([
    prisma.hotel.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, city: true, country: true, status: true },
      orderBy: { name: 'asc' },
      ...pageArgs(pagination),
    }),
    prisma.hotel.count({ where: { deletedAt: null } }),
  ]);

  if (hotels.length === 0) return { rows: [], total };

  const grouped = await prisma.booking.groupBy({
    by: ['hotelId'],
    where: { hotelId: { in: hotels.map((h) => h.id) }, ...(bookingCreatedFilter ? { createdAt: bookingCreatedFilter } : {}) },
    _count: { _all: true },
    _sum: { totalAmount: true },
  });
  const statsByHotel = new Map(grouped.map((g) => [g.hotelId, g]));

  const rows = hotels.map((h) => {
    const stats = statsByHotel.get(h.id);
    return {
      hotelId: h.id,
      name: h.name,
      city: h.city,
      country: h.country,
      status: h.status,
      totalBookings: stats?._count._all ?? 0,
      totalRevenue: new Money(stats?._sum.totalAmount ?? 0).toString(),
    };
  });

  return { rows, total };
}

// ---------------------------------------------------------------------------
// Tours -- per-tour-package booking count + revenue.
// ---------------------------------------------------------------------------
export async function toursReport({ dateFrom, dateTo } = {}, pagination) {
  const createdFilter = dateRangeFilter(dateFrom, dateTo);

  const [tours, total] = await Promise.all([
    prisma.tourPackage.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, price: true, status: true, destination: { select: { name: true } } },
      orderBy: { name: 'asc' },
      ...pageArgs(pagination),
    }),
    prisma.tourPackage.count({ where: { deletedAt: null } }),
  ]);

  if (tours.length === 0) return { rows: [], total };

  const grouped = await prisma.tourBooking.groupBy({
    by: ['tourPackageId'],
    where: { tourPackageId: { in: tours.map((t) => t.id) }, ...(createdFilter ? { createdAt: createdFilter } : {}) },
    _count: { _all: true },
    _sum: { totalAmount: true },
  });
  const statsByTour = new Map(grouped.map((g) => [g.tourPackageId, g]));

  const rows = tours.map((t) => {
    const stats = statsByTour.get(t.id);
    return {
      tourId: t.id,
      name: t.name,
      destination: t.destination?.name,
      price: new Money(t.price).toString(),
      status: t.status,
      totalBookings: stats?._count._all ?? 0,
      totalRevenue: new Money(stats?._sum.totalAmount ?? 0).toString(),
    };
  });

  return { rows, total };
}

// ---------------------------------------------------------------------------
// Destinations -- per-destination tour-booking count + revenue (aggregated
// two levels down through TourPackage since TourBooking has no destinationId).
// ---------------------------------------------------------------------------
export async function destinationsReport({ dateFrom, dateTo } = {}, pagination) {
  const createdFilter = dateRangeFilter(dateFrom, dateTo);

  const [destinations, total] = await Promise.all([
    prisma.destination.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, country: true, status: true },
      orderBy: { name: 'asc' },
      ...pageArgs(pagination),
    }),
    prisma.destination.count({ where: { deletedAt: null } }),
  ]);

  if (destinations.length === 0) return { rows: [], total };

  const tourPackages = await prisma.tourPackage.findMany({
    where: { destinationId: { in: destinations.map((d) => d.id) } },
    select: { id: true, destinationId: true },
  });
  const destinationByTourPackage = new Map(tourPackages.map((tp) => [tp.id, tp.destinationId]));

  const grouped = tourPackages.length
    ? await prisma.tourBooking.groupBy({
        by: ['tourPackageId'],
        where: {
          tourPackageId: { in: tourPackages.map((tp) => tp.id) },
          ...(createdFilter ? { createdAt: createdFilter } : {}),
        },
        _count: { _all: true },
        _sum: { totalAmount: true },
      })
    : [];

  const statsByDestination = new Map();
  for (const g of grouped) {
    const destinationId = destinationByTourPackage.get(g.tourPackageId);
    if (!destinationId) continue;
    const cur = statsByDestination.get(destinationId) ?? { count: 0, revenue: new Money(0) };
    cur.count += g._count._all;
    cur.revenue = cur.revenue.plus(new Money(g._sum.totalAmount ?? 0));
    statsByDestination.set(destinationId, cur);
  }

  const rows = destinations.map((d) => {
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
