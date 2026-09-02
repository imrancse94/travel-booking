import { and, eq, inArray, lt, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  bookingGuests,
  bookingRooms,
  bookingServices,
  bookingStatusHistory,
  bookings,
  commissions,
  rooms as roomsTable,
  roomTypes,
  services as servicesTable,
} from '../db/schema.js';
import logger from '../config/logger.js';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors.js';
import { Money, sum, roundCurrency } from '../utils/money.js';
import { env } from '../config/env.js';
import { calculateRoomStayPrice } from './pricingService.js';
import { findOverlappingRoomIds } from './availabilityService.js';
import { generateBookingNumber } from '../utils/bookingNumber.js';
import { getSettings } from './settingsService.js';
import { recordAudit } from './auditService.js';
import { notify } from '../notifications/notificationService.js';

// Locks rooms (and, for type-based selections, the room type itself) in a
// stable string-sorted order before checking overlap, so two transactions
// that both touch the same rooms/types always acquire locks in the same
// order and cannot deadlock each other. Room-type keys are prefixed so they
// can never collide with a room's UUID.
async function lockRoomsAndTypes(tx, { roomIds, roomTypeIds }) {
  const keys = [...new Set([...roomIds, ...roomTypeIds.map((id) => `roomtype:${id}`)])].sort();
  for (const key of keys) {
    // Parameterised through Drizzle's sql template, so the key is bound rather
    // than interpolated -- the same guarantee $executeRawUnsafe's $1 gave.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`);
  }
}

async function assertRoomsAvailable(tx, { roomIds, checkIn, checkOut, excludeBookingId }) {
  const overlapping = await findOverlappingRoomIds(tx, { roomIds, checkIn, checkOut, excludeBookingId });
  if (overlapping.size > 0) {
    throw new ConflictError('One or more selected rooms are no longer available for the requested dates', [
      ...overlapping,
    ]);
  }
}

// Resolves each requested room selection to a concrete roomId. A selection
// may name a specific `roomId` (staff picking an exact room) or a
// `roomTypeId` (the customer-facing case -- "a Deluxe room", not room 214).
// Must run after lockRoomsAndTypes so the candidate pool can't change under us.
async function resolveRoomSelections(tx, { hotelId, rooms, checkIn, checkOut }) {
  const roomTypeIds = [...new Set(rooms.filter((r) => !r.roomId && r.roomTypeId).map((r) => r.roomTypeId))];
  const candidatesByType = new Map();

  for (const roomTypeId of roomTypeIds) {
    const [roomType] = await tx
      .select()
      .from(roomTypes)
      .where(and(eq(roomTypes.id, roomTypeId), sql`${roomTypes.deletedAt} is null`))
      .limit(1);
    if (!roomType) throw new NotFoundError('Room type not found');
    if (roomType.hotelId !== hotelId) throw new ValidationError('Room type does not belong to the selected hotel');

    const candidates = await tx
      .select()
      .from(roomsTable)
      .where(
        and(
          eq(roomsTable.roomTypeId, roomTypeId),
          inArray(roomsTable.status, ['available', 'occupied']),
          sql`${roomsTable.deletedAt} is null`
        )
      )
      .orderBy(roomsTable.roomNumber);
    const overlapping = await findOverlappingRoomIds(tx, {
      roomIds: candidates.map((c) => c.id),
      checkIn,
      checkOut,
    });
    candidatesByType.set(
      roomTypeId,
      candidates.filter((c) => !overlapping.has(c.id))
    );
  }

  const usedRoomIds = new Set(rooms.filter((r) => r.roomId).map((r) => r.roomId));
  const resolved = [];

  for (const requested of rooms) {
    if (requested.roomId) {
      resolved.push({ ...requested });
      continue;
    }
    const pool = candidatesByType.get(requested.roomTypeId) || [];
    const pick = pool.find((c) => !usedRoomIds.has(c.id));
    if (!pick) {
      throw new ConflictError('No rooms of the selected type are available for the requested dates');
    }
    usedRoomIds.add(pick.id);
    resolved.push({ ...requested, roomId: pick.id });
  }

  return resolved;
}

/**
 * Creates a booking inside a single serializable-by-locking transaction:
 * lock rooms -> re-check availability -> recalculate price server-side ->
 * insert booking + rooms + guests + services + commission. Anything failing
 * anywhere rolls the whole transaction back, so a room is never left
 * half-reserved.
 */
export async function createBooking(input) {
  const {
    hotelId,
    customerId,
    agentId,
    checkIn,
    checkOut,
    adults = 1,
    children = 0,
    specialRequests,
    source = 'website',
    rooms,
    guests,
    services = [],
    discountAmount = 0,
    commissionPercent,
    createdByUserId,
    immediateConfirm = false,
  } = input;

  if (!rooms || rooms.length === 0) {
    throw new ValidationError('At least one room is required');
  }
  if (new Date(checkOut) <= new Date(checkIn)) {
    throw new ValidationError('Check-out date must be after check-in date');
  }
  if (!guests || guests.length === 0) {
    throw new ValidationError('At least one guest is required');
  }

  const explicitRoomIds = rooms.filter((r) => r.roomId).map((r) => r.roomId);
  const roomTypeIds = [...new Set(rooms.filter((r) => !r.roomId && r.roomTypeId).map((r) => r.roomTypeId))];
  if (rooms.some((r) => !r.roomId && !r.roomTypeId)) {
    throw new ValidationError('Each room selection needs a roomId or a roomTypeId');
  }

  const result = await db.transaction(
    async (tx) => {
      await lockRoomsAndTypes(tx, { roomIds: explicitRoomIds, roomTypeIds });
      await assertRoomsAvailable(tx, { roomIds: explicitRoomIds, checkIn, checkOut });

      const resolvedRooms = await resolveRoomSelections(tx, { hotelId, rooms, checkIn, checkOut });
      const roomIds = resolvedRooms.map((r) => r.roomId);
      if (new Set(roomIds).size !== roomIds.length) {
        throw new ConflictError('The same room cannot be booked twice in one booking');
      }

      const dbRooms = await tx.query.rooms.findMany({
        where: (r, { and: a, inArray: ia, isNull: nul }) => a(ia(r.id, roomIds), nul(r.deletedAt)),
        with: { roomType: true },
      });
      if (dbRooms.length !== roomIds.length) {
        throw new NotFoundError('One or more rooms could not be found');
      }
      for (const room of dbRooms) {
        if (room.status === 'maintenance' || room.status === 'inactive') {
          throw new ConflictError(`Room ${room.roomNumber} is not bookable (${room.status})`);
        }
        if (room.roomType.hotelId !== hotelId) {
          throw new ValidationError(`Room ${room.roomNumber} does not belong to the selected hotel`);
        }
      }

      const bookingRoomsData = [];
      let roomsSubtotal = new Money(0);
      let currency = 'USD';

      for (const requested of resolvedRooms) {
        const dbRoom = dbRooms.find((r) => r.id === requested.roomId);
        const priced = await calculateRoomStayPrice({
          tx,
          roomTypeId: dbRoom.roomTypeId,
          ratePlanId: requested.ratePlanId,
          checkIn,
          checkOut,
          adults: requested.adults ?? 1,
          children: requested.children ?? 0,
        });
        currency = priced.currency;
        roomsSubtotal = roomsSubtotal.plus(priced.totalPrice);

        bookingRoomsData.push({
          roomId: dbRoom.id,
          roomTypeId: dbRoom.roomTypeId,
          checkIn: new Date(checkIn),
          checkOut: new Date(checkOut),
          nights: priced.nights,
          ratePerNight: priced.ratePerNight.toString(),
          totalPrice: priced.totalPrice.toString(),
        });
      }

      const serviceCatalog = services.length
        ? await tx
            .select()
            .from(servicesTable)
            .where(inArray(servicesTable.id, services.map((s) => s.serviceId)))
        : [];

      const bookingServicesData = services.map((s) => {
        const svc = serviceCatalog.find((c) => c.id === s.serviceId);
        if (!svc) throw new NotFoundError(`Service ${s.serviceId} not found`);
        const qty = s.quantity ?? 1;
        const price = new Money(svc.price);
        const tax = new Money(svc.tax);
        const total = price.plus(tax).times(qty);
        return {
          serviceId: svc.id,
          quantity: qty,
          price: price.toString(),
          tax: tax.toString(),
          total: total.toString(),
        };
      });
      const servicesSubtotal = sum(bookingServicesData.map((s) => s.total));

      const settings = await getSettings();
      const subtotal = roundCurrency(roomsSubtotal.plus(servicesSubtotal));
      const discount = roundCurrency(discountAmount);
      const taxableAmount = Money.max(subtotal.minus(discount), new Money(0));
      const taxRate = new Money(settings.tax_rate_percent || 0).dividedBy(100);
      const taxAmount = roundCurrency(taxableAmount.times(taxRate));
      const totalAmount = roundCurrency(taxableAmount.plus(taxAmount));

      let commissionAmount = new Money(0);
      const effectiveCommissionPercent = commissionPercent ?? (agentId ? settings.default_commission_percent || 0 : 0);
      if (agentId && effectiveCommissionPercent > 0) {
        commissionAmount = roundCurrency(taxableAmount.times(new Money(effectiveCommissionPercent).dividedBy(100)));
      }

      const bookingNumber = await generateBookingNumber(tx);
      const initialStatus = immediateConfirm ? 'confirmed' : 'held';
      const holdExpiresAt = immediateConfirm ? null : new Date(Date.now() + env.bookingHoldMinutes * 60 * 1000);

      // Prisma wrote the booking and its children in one nested `create`.
      // Drizzle has no nested writes, so they are separate inserts -- still
      // inside this transaction, so a failure anywhere still rolls back the
      // whole booking rather than leaving a room half-reserved.
      const [created] = await tx
        .insert(bookings)
        .values({
          bookingNumber,
          hotelId,
          customerId,
          agentId: agentId || null,
          checkIn: new Date(checkIn),
          checkOut: new Date(checkOut),
          adults,
          children,
          specialRequests,
          status: initialStatus,
          source,
          currency,
          subtotal: subtotal.toString(),
          discountAmount: discount.toString(),
          taxAmount: taxAmount.toString(),
          commissionAmount: commissionAmount.toString(),
          totalAmount: totalAmount.toString(),
          paidAmount: '0',
          dueAmount: totalAmount.toString(),
          holdExpiresAt,
        })
        .returning();

      await tx.insert(bookingRooms).values(bookingRoomsData.map((br) => ({ ...br, bookingId: created.id })));

      await tx.insert(bookingGuests).values(
        guests.map((g, idx) => ({
          bookingId: created.id,
          firstName: g.firstName,
          lastName: g.lastName,
          email: g.email,
          phone: g.phone,
          dateOfBirth: g.dateOfBirth ? new Date(g.dateOfBirth) : null,
          nationality: g.nationality,
          passportNumber: g.passportNumber,
          passportExpiry: g.passportExpiry ? new Date(g.passportExpiry) : null,
          address: g.address,
          specialRequirements: g.specialRequirements,
          isPrimary: g.isPrimary ?? idx === 0,
        }))
      );

      if (bookingServicesData.length) {
        await tx
          .insert(bookingServices)
          .values(bookingServicesData.map((bs) => ({ ...bs, bookingId: created.id })));
      }

      await tx.insert(bookingStatusHistory).values({
        bookingId: created.id,
        toStatus: initialStatus,
        changedById: createdByUserId,
        reason: 'Booking created',
      });

      if (agentId && commissionAmount.greaterThan(0)) {
        await tx.insert(commissions).values({
          agentId,
          bookingId: created.id,
          percentage: effectiveCommissionPercent.toString(),
          amount: commissionAmount.toString(),
          status: 'pending',
        });
      }

      // Re-read with the relations the caller (and the API response) expects.
      return tx.query.bookings.findFirst({
        where: (b, { eq: e }) => e(b.id, created.id),
        with: { bookingRooms: true, guests: true, services: true, hotel: true, customer: true },
      });
    },
    // Prisma's 'ReadCommitted'. The guard does not lean on isolation level --
    // the advisory lock is what serialises competing bookings.
    { isolationLevel: 'read committed' }
  );

  await recordAudit({ userId: createdByUserId, action: 'booking.created', entity: 'Booking', entityId: result.id, newValue: { bookingNumber: result.bookingNumber, status: result.status } });

  if (result.customer?.email) {
    await notify({
      userId: result.customer.userId || createdByUserId,
      event: 'booking.created',
      title: 'Booking received',
      message: `Your booking ${result.bookingNumber} has been received and is ${result.status}.`,
      emailTemplate: result.status === 'confirmed' ? 'bookingConfirmation' : undefined,
      emailTo: result.status === 'confirmed' ? result.customer.email : undefined,
      emailData: {
        firstName: result.customer.firstName,
        bookingNumber: result.bookingNumber,
        hotelName: result.hotel.name,
        checkIn: result.checkIn.toISOString().slice(0, 10),
        checkOut: result.checkOut.toISOString().slice(0, 10),
        totalAmount: result.totalAmount.toString(),
        currency: result.currency,
      },
    }).catch(() => {});
  }

  return result;
}

async function transitionStatus(tx, booking, toStatus, { changedById, reason } = {}) {
  await tx.update(bookings).set({ status: toStatus }).where(eq(bookings.id, booking.id));
  await tx.insert(bookingStatusHistory).values({
    bookingId: booking.id,
    fromStatus: booking.status,
    toStatus,
    changedById,
    reason,
  });
}

export async function confirmBookingAfterPayment(bookingId, { changedById } = {}) {
  const confirmed = await db.transaction(async (tx) => {
    const booking = await tx.query.bookings.findFirst({
      where: (b, { eq: e }) => e(b.id, bookingId),
      with: { customer: true, hotel: true },
    });
    if (!booking) throw new NotFoundError('Booking not found');
    if (!['held', 'pending'].includes(booking.status)) {
      throw new ConflictError(`Booking cannot be confirmed from status ${booking.status}`);
    }
    await transitionStatus(tx, booking, 'confirmed', { changedById, reason: 'Payment received' });
    return { ...booking, status: 'confirmed' };
  });

  // A website booking is created `held` and only becomes `confirmed` here, so
  // createBooking's `status === 'confirmed'` check never fires for it -- which
  // meant the bookingConfirmation template had never once been sent and the
  // customer only ever received a payment receipt, with no itinerary.
  //
  // Sent after the transaction commits: an email dispatched inside it would go
  // out even if the commit were later rolled back.
  if (confirmed.customer?.email) {
    await notify({
      userId: confirmed.customer.userId || changedById,
      event: 'booking.confirmed',
      title: 'Booking confirmed',
      message: `Your booking ${confirmed.bookingNumber} is confirmed.`,
      emailTemplate: 'bookingConfirmation',
      emailTo: confirmed.customer.email,
      emailData: {
        firstName: confirmed.customer.firstName,
        bookingNumber: confirmed.bookingNumber,
        hotelName: confirmed.hotel?.name,
        checkIn: confirmed.checkIn.toISOString().slice(0, 10),
        checkOut: confirmed.checkOut.toISOString().slice(0, 10),
        totalAmount: confirmed.totalAmount.toString(),
        currency: confirmed.currency,
      },
    }).catch((err) => logger.error({ err, bookingId }, 'Failed to send booking confirmation email'));
  }

  return confirmed;
}

export async function releaseExpiredHolds() {
  const expired = await db
    .select({ id: bookings.id, status: bookings.status })
    .from(bookings)
    .where(and(eq(bookings.status, 'held'), lt(bookings.holdExpiresAt, new Date())));

  for (const booking of expired) {
    await db.transaction(async (tx) => {
      // Re-read inside the transaction: the hold may have been paid for
      // between the scan above and this update.
      const [fresh] = await tx.select().from(bookings).where(eq(bookings.id, booking.id)).limit(1);
      if (!fresh || fresh.status !== 'held') return;
      await transitionStatus(tx, fresh, 'cancelled', { reason: 'Hold expired' });
    });
  }

  return expired.length;
}

export async function calculateCancellation(booking, settings) {
  const now = new Date();
  const hoursUntilCheckIn = (new Date(booking.checkIn).getTime() - now.getTime()) / (1000 * 60 * 60);
  const total = new Money(booking.totalAmount);

  // Tiered policy: free 7+ days out, partial charge inside the free window
  // (covers the "50% before 3 days" example), full charge inside 24h.
  let feePercent = 0;
  if (hoursUntilCheckIn <= (settings.cancellation_full_within_hours || 24)) {
    feePercent = 100;
  } else if (hoursUntilCheckIn <= (settings.cancellation_free_days || 7) * 24) {
    feePercent = settings.cancellation_partial_percent || 50;
  } else {
    feePercent = 0;
  }

  const fee = roundCurrency(total.times(feePercent).dividedBy(100));
  const refundable = roundCurrency(Money.max(new Money(booking.paidAmount).minus(fee), new Money(0)));
  return { cancellationFee: fee, refundableAmount: refundable, feePercent };
}

export async function cancelBooking(bookingId, { reason, changedById } = {}) {
  const settings = await getSettings();

  const result = await db.transaction(async (tx) => {
    const booking = await tx.query.bookings.findFirst({
      where: (b, { eq: e }) => e(b.id, bookingId),
      with: { customer: true },
    });
    if (!booking) throw new NotFoundError('Booking not found');
    if (['cancelled', 'checked_out', 'completed'].includes(booking.status)) {
      throw new ConflictError(`Booking is already ${booking.status}`);
    }

    const { cancellationFee, refundableAmount } = await calculateCancellation(booking, settings);

    // Return the *updated* row (not the pre-update `booking`), so the API
    // response reflects the cancelled status/cancelledAt the caller just
    // caused -- same pattern as checkInBooking/checkOutBooking below.
    await tx
      .update(bookings)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
        cancellationFee: cancellationFee.toString(),
        refundableAmount: refundableAmount.toString(),
        cancellationReason: reason,
      })
      .where(eq(bookings.id, bookingId));

    const cancelled = await tx.query.bookings.findFirst({
      where: (b, { eq: e }) => e(b.id, bookingId),
      with: { customer: true },
    });

    await tx.insert(bookingStatusHistory).values({
      bookingId,
      fromStatus: booking.status,
      toStatus: 'cancelled',
      changedById,
      reason,
    });

    return { ...cancelled, cancellationFee, refundableAmount };
  });

  await recordAudit({ userId: changedById, action: 'booking.cancelled', entity: 'Booking', entityId: bookingId, newValue: { reason } });

  if (result.customer?.email) {
    await notify({
      userId: result.customer.userId,
      event: 'booking.cancelled',
      title: 'Booking cancelled',
      message: `Booking ${result.bookingNumber} has been cancelled.`,
      emailTemplate: 'bookingCancellation',
      emailTo: result.customer.email,
      emailData: {
        firstName: result.customer.firstName,
        bookingNumber: result.bookingNumber,
        refundableAmount: result.refundableAmount.toString(),
        currency: result.currency,
      },
    }).catch(() => {});
  }

  return result;
}

export async function checkInBooking(bookingId, { staffUserId, notes } = {}) {
  return db.transaction(async (tx) => {
    const booking = await tx.query.bookings.findFirst({
      where: (b, { eq: e }) => e(b.id, bookingId),
      with: { bookingRooms: true },
    });
    if (!booking) throw new NotFoundError('Booking not found');
    if (booking.status !== 'confirmed') {
      throw new ConflictError(`Only confirmed bookings can be checked in (current: ${booking.status})`);
    }

    await tx
      .update(bookingRooms)
      .set({ actualCheckIn: new Date(), checkedInById: staffUserId, notes })
      .where(eq(bookingRooms.bookingId, bookingId));

    await tx
      .update(roomsTable)
      .set({ status: 'occupied' })
      .where(inArray(roomsTable.id, booking.bookingRooms.map((br) => br.roomId)));

    await transitionStatus(tx, booking, 'checked_in', { changedById: staffUserId, reason: 'Guest checked in' });

    return tx.query.bookings.findFirst({
      where: (b, { eq: e }) => e(b.id, bookingId),
      with: { bookingRooms: true },
    });
  });
}

export async function checkOutBooking(bookingId, { staffUserId, notes } = {}) {
  return db.transaction(async (tx) => {
    const booking = await tx.query.bookings.findFirst({
      where: (b, { eq: e }) => e(b.id, bookingId),
      with: { bookingRooms: true },
    });
    if (!booking) throw new NotFoundError('Booking not found');
    if (booking.status !== 'checked_in') {
      throw new ConflictError(`Only checked-in bookings can be checked out (current: ${booking.status})`);
    }

    await tx
      .update(bookingRooms)
      .set({ actualCheckOut: new Date(), checkedOutById: staffUserId, notes })
      .where(eq(bookingRooms.bookingId, bookingId));

    await tx
      .update(roomsTable)
      .set({ status: 'available' })
      .where(inArray(roomsTable.id, booking.bookingRooms.map((br) => br.roomId)));

    await transitionStatus(tx, booking, 'checked_out', { changedById: staffUserId, reason: 'Guest checked out' });

    return tx.query.bookings.findFirst({
      where: (b, { eq: e }) => e(b.id, bookingId),
      with: { bookingRooms: true },
    });
  });
}
