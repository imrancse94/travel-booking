import { and, asc, count, desc, eq, gte, inArray, isNull, lt, sum as sqlSum } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  bookings,
  commissions,
  customers,
  hotels,
  payments,
  roomTypes,
  rooms,
  tourBookings,
  tourPackages,
} from '../db/schema.js';
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

/** Prisma's `count()` / `_sum` returned numbers; pg returns strings for both. */
async function countRows(table, where) {
  const [{ value }] = await db.select({ value: count() }).from(table).where(where);
  return Number(value);
}

async function sumColumn(table, column, where) {
  const [{ value }] = await db.select({ value: sqlSum(column) }).from(table).where(where);
  return new Money(value ?? 0);
}

async function getRevenueOverTime(days = 30) {
  const from = addDays(startOfDay(), -(days - 1));
  const rows = await db
    .select({ amount: payments.amount, paidAt: payments.paidAt })
    .from(payments)
    .where(and(eq(payments.status, 'paid'), gte(payments.paidAt, from)));
  const bucketed = bucketByDay(rows, 'paidAt', 'amount');
  return lastNDayKeys(days).map((date) => ({
    date,
    revenue: (bucketed.get(date)?.total ?? new Money(0)).toString(),
  }));
}

async function getBookingTrends(days = 30) {
  const from = addDays(startOfDay(), -(days - 1));
  const rows = await db.select({ createdAt: bookings.createdAt }).from(bookings).where(gte(bookings.createdAt, from));
  const bucketed = bucketByDay(rows, 'createdAt');
  return lastNDayKeys(days).map((date) => ({
    date,
    bookings: bucketed.get(date)?.count ?? 0,
  }));
}

async function getTopHotels(limit = 5) {
  const grouped = await db
    .select({ hotelId: bookings.hotelId, bookingCount: count(), revenue: sqlSum(bookings.totalAmount) })
    .from(bookings)
    .groupBy(bookings.hotelId)
    .orderBy(desc(count()))
    .limit(limit);
  if (grouped.length === 0) return [];

  const hotelRows = await db
    .select({ id: hotels.id, name: hotels.name })
    .from(hotels)
    .where(inArray(hotels.id, grouped.map((g) => g.hotelId)));
  const nameById = new Map(hotelRows.map((h) => [h.id, h.name]));

  return grouped.map((g) => ({
    hotelId: g.hotelId,
    hotelName: nameById.get(g.hotelId) ?? 'Unknown',
    totalBookings: Number(g.bookingCount),
    totalRevenue: new Money(g.revenue ?? 0).toString(),
  }));
}

async function getTopDestinations(limit = 5) {
  const grouped = await db
    .select({ tourPackageId: tourBookings.tourPackageId, bookingCount: count() })
    .from(tourBookings)
    .groupBy(tourBookings.tourPackageId);
  if (grouped.length === 0) return [];

  const packages = await db.query.tourPackages.findMany({
    where: inArray(tourPackages.id, grouped.map((g) => g.tourPackageId)),
    columns: { id: true, destinationId: true },
    with: { destination: { columns: { name: true } } },
  });
  const tourPackageById = new Map(packages.map((tp) => [tp.id, tp]));

  const countByDestination = new Map();
  for (const g of grouped) {
    const tp = tourPackageById.get(g.tourPackageId);
    if (!tp) continue;
    const cur = countByDestination.get(tp.destinationId) ?? { name: tp.destination?.name, count: 0 };
    cur.count += Number(g.bookingCount);
    countByDestination.set(tp.destinationId, cur);
  }

  return [...countByDestination.entries()]
    .map(([destinationId, v]) => ({ destinationId, destinationName: v.name, totalTourBookings: v.count }))
    .sort((a, b) => b.totalTourBookings - a.totalTourBookings)
    .slice(0, limit);
}

async function getPaymentMethodBreakdown() {
  const grouped = await db
    .select({ method: payments.method, paymentCount: count(), total: sqlSum(payments.amount) })
    .from(payments)
    .groupBy(payments.method);

  return grouped.map((g) => ({
    method: g.method,
    count: Number(g.paymentCount),
    total: new Money(g.total ?? 0).toString(),
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
    revenue,
    pendingPayments,
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
    countRows(bookings, undefined),
    countRows(bookings, and(gte(bookings.createdAt, today), lt(bookings.createdAt, todayEnd))),
    countRows(
      bookings,
      and(gte(bookings.checkIn, today), lt(bookings.checkIn, weekEnd), inArray(bookings.status, ACTIVE_BOOKING_STATUSES))
    ),
    countRows(
      bookings,
      and(
        gte(bookings.checkOut, today),
        lt(bookings.checkOut, weekEnd),
        inArray(bookings.status, ['confirmed', 'checked_in'])
      )
    ),
    sumColumn(payments, payments.amount, eq(payments.status, 'paid')),
    sumColumn(bookings, bookings.dueAmount, inArray(bookings.status, DUE_STATUSES)),
    countRows(rooms, and(eq(rooms.status, 'available'), isNull(rooms.deletedAt))),
    countRows(rooms, and(eq(rooms.status, 'occupied'), isNull(rooms.deletedAt))),
    countRows(customers, isNull(customers.deletedAt)),
    countRows(tourBookings, undefined),
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
    revenue: revenue.toString(),
    pendingPayments: pendingPayments.toString(),
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

  const forHotel = hotelId ? [eq(bookings.hotelId, hotelId)] : [];

  const [todaysCheckIns, todaysCheckOuts, roomStatusGroups, upcomingBookings] = await Promise.all([
    countRows(
      bookings,
      and(
        ...forHotel,
        gte(bookings.checkIn, today),
        lt(bookings.checkIn, todayEnd),
        inArray(bookings.status, ['confirmed', 'checked_in'])
      )
    ),
    countRows(
      bookings,
      and(
        ...forHotel,
        gte(bookings.checkOut, today),
        lt(bookings.checkOut, todayEnd),
        inArray(bookings.status, ['checked_in', 'checked_out'])
      )
    ),
    // `roomType: { hotelId }` was a nested relation filter; Drizzle joins instead.
    db
      .select({ status: rooms.status, roomCount: count() })
      .from(rooms)
      .innerJoin(roomTypes, eq(rooms.roomTypeId, roomTypes.id))
      .where(and(isNull(rooms.deletedAt), ...(hotelId ? [eq(roomTypes.hotelId, hotelId)] : [])))
      .groupBy(rooms.status),
    db.query.bookings.findMany({
      where: and(
        ...forHotel,
        gte(bookings.checkIn, today),
        lt(bookings.checkIn, weekEnd),
        inArray(bookings.status, ACTIVE_BOOKING_STATUSES)
      ),
      with: {
        customer: { columns: { firstName: true, lastName: true } },
        hotel: { columns: { name: true } },
      },
      orderBy: asc(bookings.checkIn),
      limit: 20,
    }),
  ]);

  const countByStatus = Object.fromEntries(roomStatusGroups.map((g) => [g.status, Number(g.roomCount)]));
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
  const mine = eq(bookings.agentId, agentId);
  const withHotelAndCustomer = {
    hotel: { columns: { name: true } },
    customer: { columns: { firstName: true, lastName: true } },
  };

  const [totalBookings, recentBookings, customerRows, commissionGroups, upcomingTrips, pendingPayments] =
    await Promise.all([
      countRows(bookings, mine),
      db.query.bookings.findMany({
        where: mine,
        with: withHotelAndCustomer,
        orderBy: desc(bookings.createdAt),
        limit: 5,
      }),
      // Prisma's `distinct: ['customerId']` post-filtered the rows; SELECT
      // DISTINCT does it in the database.
      db.selectDistinct({ customerId: bookings.customerId }).from(bookings).where(mine),
      db
        .select({ status: commissions.status, commissionCount: count(), amount: sqlSum(commissions.amount) })
        .from(commissions)
        .where(eq(commissions.agentId, agentId))
        .groupBy(commissions.status),
      db.query.bookings.findMany({
        where: and(mine, gte(bookings.checkIn, now), inArray(bookings.status, ACTIVE_BOOKING_STATUSES)),
        with: withHotelAndCustomer,
        orderBy: asc(bookings.checkIn),
        limit: 10,
      }),
      sumColumn(bookings, bookings.dueAmount, and(mine, inArray(bookings.status, DUE_STATUSES))),
    ]);

  return {
    totalBookings,
    recentBookings,
    totalCustomers: customerRows.length,
    commissions: commissionGroups.map((c) => ({
      status: c.status,
      count: Number(c.commissionCount),
      amount: new Money(c.amount ?? 0).toString(),
    })),
    upcomingTrips,
    pendingPayments: pendingPayments.toString(),
  };
}
