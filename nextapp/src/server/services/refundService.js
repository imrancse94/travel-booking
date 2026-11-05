import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { bookings, payments, refunds } from '../db/schema.js';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors.js';
import { Money, roundCurrency } from '../utils/money.js';
import { recordAudit } from './auditService.js';
import { notify } from '../notifications/notificationService.js';
import * as refundRepository from '../repositories/refundRepository.js';
import * as paymentRepository from '../repositories/paymentRepository.js';

export async function listRefunds(query) {
  const { items, total } = await refundRepository.list(query);
  return { items, total };
}

export async function getRefund(id) {
  const refund = await refundRepository.findById(id);
  if (!refund) throw new NotFoundError('Refund not found');
  return refund;
}

/**
 * Refunds part or all of a payment. Mirrors a real gateway's async refund
 * flow (created pending, then confirmed) even though the mock flow resolves
 * both steps immediately within the same transaction.
 */
export async function refundPayment({ paymentId, amount, reason }, actorId) {
  const payment = await paymentRepository.findByIdWithBookingCustomer(paymentId);
  if (!payment) throw new NotFoundError('Payment not found');
  if (!['paid', 'partially_refunded'].includes(payment.status)) {
    throw new ConflictError(`Cannot refund a payment with status ${payment.status}`);
  }

  const refundAmount = new Money(amount ?? 0);
  if (!refundAmount.greaterThan(0)) {
    throw new ValidationError('Refund amount must be greater than zero');
  }

  const alreadyRefunded = new Money(await refundRepository.sumCompletedForPayment(paymentId));
  const available = new Money(payment.amount).minus(alreadyRefunded);
  if (refundAmount.greaterThan(available)) {
    throw new ValidationError(`Refund amount exceeds refundable balance (${available.toString()})`);
  }

  const refund = await db.transaction(async (tx) => {
    const [createdRefund] = await tx
      .insert(refunds)
      .values({ paymentId, amount: refundAmount.toString(), reason, status: 'pending' })
      .returning();

    const [completedRefund] = await tx
      .update(refunds)
      .set({ status: 'completed', processedAt: new Date() })
      .where(eq(refunds.id, createdRefund.id))
      .returning();

    const totalRefunded = alreadyRefunded.plus(refundAmount);
    const paymentStatus = totalRefunded.greaterThanOrEqualTo(new Money(payment.amount)) ? 'refunded' : 'partially_refunded';
    await tx.update(payments).set({ status: paymentStatus }).where(eq(payments.id, paymentId));

    const newPaidAmount = roundCurrency(
      Money.max(new Money(payment.booking.paidAmount).minus(refundAmount), new Money(0))
    );
    const newDueAmount = roundCurrency(
      Money.max(new Money(payment.booking.totalAmount).minus(newPaidAmount), new Money(0))
    );
    await tx
      .update(bookings)
      .set({ paidAmount: newPaidAmount.toString(), dueAmount: newDueAmount.toString() })
      .where(eq(bookings.id, payment.bookingId));

    return completedRefund;
  });

  await recordAudit({
    userId: actorId,
    action: 'refund.processed',
    entity: 'Refund',
    entityId: refund.id,
    newValue: { paymentId, amount: refundAmount.toString(), reason },
  });

  if (payment.booking.customer?.email) {
    await notify({
      userId: payment.booking.customer.userId,
      event: 'refund.processed',
      title: 'Refund processed',
      message: `A refund of ${payment.booking.currency} ${refundAmount.toString()} has been processed for booking ${payment.booking.bookingNumber}.`,
      emailTemplate: 'refundProcessed',
      emailTo: payment.booking.customer.email,
      emailData: {
        firstName: payment.booking.customer.firstName,
        amount: refundAmount.toString(),
        currency: payment.booking.currency,
        bookingNumber: payment.booking.bookingNumber,
      },
    }).catch(() => {});
  }

  return refund;
}
