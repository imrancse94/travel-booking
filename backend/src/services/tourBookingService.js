import { prisma } from '../config/prisma.js';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors.js';
import { Money, roundCurrency } from '../utils/money.js';
import { generateTourBookingNumber } from '../utils/bookingNumber.js';
import { recordAudit } from './auditService.js';
import { notify } from '../notifications/notificationService.js';

/**
 * Creates a tour booking inside a single transaction: validate the tour
 * package and participant count, recalculate price server-side (never
 * trust a client-supplied price), generate the booking number, and insert
 * the row with status "pending".
 */
export async function createTourBooking(input) {
  const { tourPackageId, customerId, participants, travelDate, discountAmount = 0, createdByUserId } = input;

  if (!tourPackageId) throw new ValidationError('tourPackageId is required');
  if (!customerId) throw new ValidationError('customerId is required');
  if (!participants || participants < 1) throw new ValidationError('At least one participant is required');
  if (!travelDate || Number.isNaN(Date.parse(travelDate))) throw new ValidationError('A valid travel date is required');

  const result = await prisma.$transaction(async (tx) => {
    const tourPackage = await tx.tourPackage.findFirst({ where: { id: tourPackageId, deletedAt: null } });
    if (!tourPackage) throw new NotFoundError('Tour package not found');
    if (tourPackage.status !== 'active') {
      throw new ConflictError('This tour package is not currently available for booking');
    }
    if (participants > tourPackage.maxParticipants) {
      throw new ValidationError(`This tour package allows a maximum of ${tourPackage.maxParticipants} participants`);
    }

    const customer = await tx.customer.findFirst({ where: { id: customerId, deletedAt: null } });
    if (!customer) throw new NotFoundError('Customer not found');

    const price = roundCurrency(new Money(tourPackage.price).times(participants));
    const discount = roundCurrency(discountAmount);
    const taxAmount = new Money(0);
    const totalAmount = roundCurrency(Money.max(price.minus(discount), new Money(0)).plus(taxAmount));

    const bookingNumber = await generateTourBookingNumber(tx);

    const booking = await tx.tourBooking.create({
      data: {
        bookingNumber,
        tourPackageId,
        customerId,
        participants,
        travelDate: new Date(travelDate),
        price: price.toString(),
        discountAmount: discount.toString(),
        taxAmount: taxAmount.toString(),
        totalAmount: totalAmount.toString(),
        paidAmount: '0',
        currency: tourPackage.currency,
        status: 'pending',
      },
      include: {
        tourPackage: { select: { id: true, name: true } },
        customer: { select: { id: true, firstName: true, lastName: true, email: true, userId: true } },
      },
    });

    return booking;
  });

  await recordAudit({
    userId: createdByUserId,
    action: 'tour_booking.created',
    entity: 'TourBooking',
    entityId: result.id,
    newValue: { bookingNumber: result.bookingNumber, status: result.status },
  });

  await notify({
    userId: result.customer?.userId || createdByUserId,
    event: 'tour_booking.created',
    title: 'Tour booking received',
    message: `Your tour booking ${result.bookingNumber} for ${result.tourPackage.name} has been received and is ${result.status}.`,
    metadata: { bookingNumber: result.bookingNumber, tourPackageId },
  }).catch(() => {});

  return result;
}

export async function cancelTourBooking(id, actorId) {
  const result = await prisma.$transaction(async (tx) => {
    const booking = await tx.tourBooking.findUnique({
      where: { id },
      include: { customer: { select: { id: true, firstName: true, lastName: true, email: true, userId: true } }, tourPackage: { select: { id: true, name: true } } },
    });
    if (!booking) throw new NotFoundError('Tour booking not found');
    if (['cancelled', 'completed'].includes(booking.status)) {
      throw new ConflictError(`Tour booking is already ${booking.status}`);
    }

    const updated = await tx.tourBooking.update({ where: { id }, data: { status: 'cancelled' } });
    return { ...booking, ...updated };
  });

  await recordAudit({ userId: actorId, action: 'tour_booking.cancelled', entity: 'TourBooking', entityId: id });

  await notify({
    userId: result.customer?.userId || actorId,
    event: 'tour_booking.cancelled',
    title: 'Tour booking cancelled',
    message: `Your tour booking ${result.bookingNumber} for ${result.tourPackage.name} has been cancelled.`,
    metadata: { bookingNumber: result.bookingNumber },
  }).catch(() => {});

  return result;
}
