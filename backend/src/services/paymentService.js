import { prisma } from '../config/prisma.js';
import logger from '../config/logger.js';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors.js';
import { Money, roundCurrency } from '../utils/money.js';
import { resolvePaymentGateway } from '../integrations/payment/paymentGateway.js';
import { confirmBookingAfterPayment } from './bookingService.js';
import { recordAudit } from './auditService.js';
import { notify } from '../notifications/notificationService.js';
import * as paymentRepository from '../repositories/paymentRepository.js';

const NON_PAYABLE_STATUSES = ['cancelled', 'completed', 'no_show'];

export async function listPayments(query) {
  const { items, total } = await paymentRepository.list(query);
  return { items, total };
}

export async function getPayment(id) {
  const payment = await paymentRepository.findById(id);
  if (!payment) throw new NotFoundError('Payment not found');
  return payment;
}

/**
 * Charges the payment gateway and records the result against a booking.
 * Always creates a Payment row (status paid/failed mirrors the gateway
 * result) rather than throwing on a declined charge, matching how a real
 * gateway webhook flow would be reconciled.
 */
export async function recordPayment({ bookingId, amount, method, gateway, metadata }, actorId) {
  const money = new Money(amount ?? 0);
  if (!money.greaterThan(0)) {
    throw new ValidationError('Payment amount must be greater than zero');
  }

  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { customer: true } });
  if (!booking) throw new NotFoundError('Booking not found');
  if (NON_PAYABLE_STATUSES.includes(booking.status)) {
    throw new ConflictError(`Cannot record a payment for a ${booking.status} booking`);
  }

  const gatewayInstance = resolvePaymentGateway(gateway);

  let chargeResult;
  try {
    chargeResult = await gatewayInstance.charge({
      amount: money.toNumber(),
      currency: booking.currency,
      method,
      metadata,
    });
  } catch (err) {
    chargeResult = { success: false, transactionId: null, raw: { error: err.message } };
  }

  const status = chargeResult.success ? 'paid' : 'failed';

  const { payment, updatedBooking } = await prisma.$transaction(async (tx) => {
    const createdPayment = await tx.payment.create({
      data: {
        bookingId,
        transactionId: chargeResult.transactionId,
        amount: money.toString(),
        currency: booking.currency,
        method,
        gateway: gatewayInstance.name,
        status,
        paidAt: chargeResult.success ? new Date() : null,
        metadata: { ...(metadata || {}), gatewayRaw: chargeResult.raw },
      },
    });

    let bookingAfterUpdate = booking;
    if (chargeResult.success) {
      const newPaidAmount = roundCurrency(new Money(booking.paidAmount).plus(money));
      const newDueAmount = roundCurrency(Money.max(new Money(booking.totalAmount).minus(newPaidAmount), new Money(0)));
      bookingAfterUpdate = await tx.booking.update({
        where: { id: bookingId },
        data: { paidAmount: newPaidAmount.toString(), dueAmount: newDueAmount.toString() },
      });
    }

    return { payment: createdPayment, updatedBooking: bookingAfterUpdate };
  });

  await recordAudit({
    userId: actorId,
    action: 'payment.recorded',
    entity: 'Payment',
    entityId: payment.id,
    newValue: { bookingId, amount: money.toString(), method, status, gateway: gatewayInstance.name },
  });

  if (!chargeResult.success) {
    return payment;
  }

  const fullyPaid = new Money(updatedBooking.paidAmount).greaterThanOrEqualTo(new Money(updatedBooking.totalAmount));
  if (fullyPaid && ['held', 'pending'].includes(booking.status)) {
    await confirmBookingAfterPayment(bookingId, { changedById: actorId }).catch((err) => {
      logger.error({ err, bookingId }, 'Failed to auto-confirm booking after full payment');
    });
  }

  if (booking.customer?.email) {
    await notify({
      userId: booking.customer.userId,
      event: 'payment.received',
      title: 'Payment received',
      message: `Payment of ${booking.currency} ${money.toString()} received for booking ${booking.bookingNumber}.`,
      emailTemplate: 'paymentReceipt',
      emailTo: booking.customer.email,
      emailData: {
        firstName: booking.customer.firstName,
        amount: money.toString(),
        currency: booking.currency,
        bookingNumber: booking.bookingNumber,
      },
    }).catch(() => {});
  }

  return payment;
}
