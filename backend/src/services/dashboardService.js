import { prisma } from '../config/prisma.js';
import { Money } from '../utils/money.js';
import { startOfDay, endOfDay, addDays, toDayKey, lastNDayKeys } from '../utils/dateRange.js';

const ACTIVE_BOOKING_STATUSES = ['pending', 'held', 'confirmed', 'checked_in'];
const DUE_STATUSES = ['confirmed', 'checked_in'];

function bucketByDay(rows, dateField, valueField) {
  const map = new Map();
  for (const row of rows) {
    const key = toDayKey(row[dateField]);
    const cur = map.get(key) ?? { count: 0, total: new Money(0) };
    cur.count += 1;
    if (valueField) cur.total = cur.total.plus(new Money(row[valueField] ?? 0));
    map.set(key, cur);
  }
  return map;
}

async function getRevenueOverTime(days = 30) {
  const from = addDays(startOfDay(), -(days - 1));
  const payments = await prisma.payment.findMany({
    where: { status: 'paid', paidAt: { gte: from } },
    select: { amount: true, paidAt: true },
  });
  const bucketed = bucketByDay(payments, 'paidAt', 'amount');
  return lastNDayKeys(days).map((date) => ({
    date,
    revenue: (bucketed.get(date)?.total ?? new Money(0)).toString(),
  }));
}

async function getBookingTrends(days = 30) {
  const from = addDays(startOfDay(), -(days - 1));
  const bookings = await prisma.booking.findMany({
    where: { createdAt: { gte: from } },
    select: { createdAt: true },
  });
  const bucketed = bucketByDay(bookings, 'createdAt');
  return lastNDayKeys(days).map((date) => ({
    date,
    bookings: bucketed.get(date)?.count ?? 0,
  }));
}

async function getTopHotels(limit = 5) {
  const grouped = await prisma.booking.groupBy({
    by: ['hotelId'],
    _count: { _all: true },
    _sum: { totalAmount: true },
    orderBy: { _count: { hotelId: 'desc' } },
    take: limit,
  });
  if (grouped.length === 0) return [];

  const hotels = await prisma.hotel.findMany({
    where: { id: { in: grouped.map((g) => g.hotelId) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(hotels.map((h) => [h.id, h.name]));

  return grouped.map((g) => ({
    hotelId: g.hotelId,
    hotelName: nameById.get(g.hotelId) ?? 'Unknown',
    totalBookings: g._count._all,
    totalRevenue: new Money(g._sum.totalAmount ?? 0).toString(),
  }));
}

async function getTopDestinations(limit = 5) {
  const grouped = await prisma.tourBooking.groupBy({
    by: ['tourPackageId'],
    _count: { _all: true },
  });
  if (grouped.length === 0) return [];

  const tourPackages = await prisma.tourPackage.findMany({
    where: { id: { in: grouped.map((g) => g.tourPackageId) } },
    select: { id: true, destinationId: true, destination: { select: { name: true } } },
  });
  const tourPackageById = new Map(tourPackages.map((tp) => [tp.id, tp]));

  const countByDestination = new Map();
  for (const g of grouped) {
    const tp = tourPackageById.get(g.tourPackageId);
    if (!tp) continue;
    const cur = countByDestination.get(tp.destinationId) ?? { name: tp.destination?.name, count: 0 };
    cur.count += g._count._all;
    countByDestination.set(tp.destinationId, cur);
  }

  return [...countByDestination.entries()]
    .map(([destinationId, v]) => ({ destinationId, destinationName: v.name, totalTourBookings: v.count }))
    .sort((a, b) => b.totalTourBookings - a.totalTourBookings)
    .slice(0, limit);
}

async function getPaymentMethodBreakdown() {
  const grouped = await prisma.payment.groupBy({
    by: ['method'],
    _count: { _all: true },
    _sum: { amount: true },
  });

  return grouped.map((g) => ({
    method: g.method,
    count: g._count._all,
    total: new Money(g._sum.amount ?? 0).toString(),
  }));
}

/**
 * Agency-wide admin dashboard: headline counts, revenue/pending payments,
 * room occupancy counts, plus the last-30-days time series and top-N
 * breakdowns instructions.md asks for.
 */
export async function getAdminDashboard() {
  const today = startOfDay();
  const todayEnd = endOfDay();
  const weekEnd = addDays(todayEnd, 6);

  const [
    totalBookings,
    todaysBookings,
    upcomingCheckIns,
    upcomingCheckOuts,
    revenueAgg,
    pendingPaymentsAgg,
    availableRooms,
    occupiedRooms,
    totalCustomers,
    totalTourBookings,
    revenueOverTime,
    bookingTrends,
    topHotels,
    topDestinations,
    paymentMethods,
  ] = await Promise.all([
    prisma.booking.count(),
    prisma.booking.count({ where: { createdAt: { gte: today, lt: todayEnd } } }),
    prisma.booking.count({ where: { checkIn: { gte: today, lt: weekEnd }, status: { in: ACTIVE_BOOKING_STATUSES } } }),
    prisma.booking.count({ where: { checkOut: { gte: today, lt: weekEnd }, status: { in: ['confirmed', 'checked_in'] } } }),
    prisma.payment.aggregate({ where: { status: 'paid' }, _sum: { amount: true } }),
    prisma.booking.aggregate({ where: { status: { in: DUE_STATUSES } }, _sum: { dueAmount: true } }),
    prisma.room.count({ where: { status: 'available', deletedAt: null } }),
    prisma.room.count({ where: { status: 'occupied', deletedAt: null } }),
    prisma.customer.count({ where: { deletedAt: null } }),
    prisma.tourBooking.count(),
    getRevenueOverTime(30),
    getBookingTrends(30),
    getTopHotels(5),
    getTopDestinations(5),
    getPaymentMethodBreakdown(),
  ]);

  return {
    totalBookings,
    todaysBookings,
    upcomingCheckIns,
    upcomingCheckOuts,
    revenue: new Money(revenueAgg._sum.amount ?? 0).toString(),
    pendingPayments: new Money(pendingPaymentsAgg._sum.dueAmount ?? 0).toString(),
    availableRooms,
    occupiedRooms,
    totalCustomers,
    totalTourBookings,
    revenueOverTime,
    bookingTrends,
    topHotels,
    topDestinations,
    paymentMethods,
  };
}

/**
 * Hotel-admin dashboard, optionally scoped to a single hotel via `hotelId`
 * (there is no user-to-hotel ownership mapping in the schema, so the caller
 * is trusted to pass their own hotel's id).
 */
export async function getHotelDashboard({ hotelId } = {}) {
  const today = startOfDay();
  const todayEnd = endOfDay();
  const weekEnd = addDays(todayEnd, 6);

  const bookingHotelFilter = hotelId ? { hotelId } : {};
  const roomHotelFilter = hotelId ? { roomType: { hotelId } } : {};

  const [todaysCheckIns, todaysCheckOuts, roomStatusGroups, upcomingBookings] = await Promise.all([
    prisma.booking.count({
      where: { ...bookingHotelFilter, checkIn: { gte: today, lt: todayEnd }, status: { in: ['confirmed', 'checked_in'] } },
    }),
    prisma.booking.count({
      where: { ...bookingHotelFilter, checkOut: { gte: today, lt: todayEnd }, status: { in: ['checked_in', 'checked_out'] } },
    }),
    prisma.room.groupBy({
      by: ['status'],
      where: { ...roomHotelFilter, deletedAt: null },
      _count: { _all: true },
    }),
    prisma.booking.findMany({
      where: { ...bookingHotelFilter, checkIn: { gte: today, lt: weekEnd }, status: { in: ACTIVE_BOOKING_STATUSES } },
      include: {
        customer: { select: { firstName: true, lastName: true } },
        hotel: { select: { name: true } },
      },
      orderBy: { checkIn: 'asc' },
      take: 20,
    }),
  ]);

  const countByStatus = Object.fromEntries(roomStatusGroups.map((g) => [g.status, g._count._all]));
  const occupied = countByStatus.occupied ?? 0;
  const available = countByStatus.available ?? 0;
  const maintenance = countByStatus.maintenance ?? 0;
  const inactive = countByStatus.inactive ?? 0;
  const totalRooms = occupied + available + maintenance + inactive;

  return {
    hotelId: hotelId ?? null,
    todaysCheckIns,
    todaysCheckOuts,
    occupiedRooms: occupied,
    availableRooms: available,
    maintenanceRooms: maintenance,
    inactiveRooms: inactive,
    totalRooms,
    occupancyPercentage: totalRooms > 0 ? Math.round((occupied / totalRooms) * 10000) / 100 : 0,
    upcomingBookings,
  };
}

/** Per-agent dashboard, scoped to the authenticated agent's own bookings. */
export async function getAgentDashboard(agentId) {
  const now = new Date();

  const [totalBookings, recentBookings, customerRows, commissionGroups, upcomingTrips, dueAgg] = await Promise.all([
    prisma.booking.count({ where: { agentId } }),
    prisma.booking.findMany({
      where: { agentId },
      include: { hotel: { select: { name: true } }, customer: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.booking.findMany({ where: { agentId }, distinct: ['customerId'], select: { customerId: true } }),
    prisma.commission.groupBy({ by: ['status'], where: { agentId }, _count: { _all: true }, _sum: { amount: true } }),
    prisma.booking.findMany({
      where: { agentId, checkIn: { gte: now }, status: { in: ACTIVE_BOOKING_STATUSES } },
      include: { hotel: { select: { name: true } }, customer: { select: { firstName: true, lastName: true } } },
      orderBy: { checkIn: 'asc' },
      take: 10,
    }),
    prisma.booking.aggregate({ where: { agentId, status: { in: DUE_STATUSES } }, _sum: { dueAmount: true } }),
  ]);

  return {
    totalBookings,
    recentBookings,
    totalCustomers: customerRows.length,
    commissions: commissionGroups.map((c) => ({
      status: c.status,
      count: c._count._all,
      amount: new Money(c._sum.amount ?? 0).toString(),
    })),
    upcomingTrips,
    pendingPayments: new Money(dueAgg._sum.dueAmount ?? 0).toString(),
  };
}
