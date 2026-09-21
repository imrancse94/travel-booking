'use server';

import { withActionResult } from './_actionResult.js';
import { requireActionUser, getActionRequestLike } from './_actionAuth.js';
import { requirePermission } from '../middleware/withPermission.js';
import { bookingLimit } from '../lib/rateLimit.js';
import { parse } from '../lib/parseRequest.js';
import { createBookingSchema, cancelBookingSchema, idParamSchema, checkInOutSchema } from '../validators/booking.validators.js';
import { createPaymentSchema } from '../validators/payment.validators.js';
import * as bookingService from '../services/bookingService.js';
import * as paymentService from '../services/paymentService.js';

/**
 * Checkout.jsx's handleSubmit calls this, then separately calls
 * chargeBookingAction -- kept as two actions (not one combined action) on
 * purpose: handleRetryPayment calls chargeBookingAction alone, against the
 * already-created booking, and must never re-create it. Collapsing these
 * into one action would make that retry path either re-book or need its own
 * special-cased action, both worse than just keeping the two-call shape the
 * client already has.
 */
export async function createBookingAction(payload) {
  return withActionResult(async () => {
    const user = await requireActionUser();
    bookingLimit(await getActionRequestLike(), 'bookings');
    requirePermission(user, 'bookings.create');
    const body = parse('body', payload, createBookingSchema);
    return bookingService.createBookingForUser(user, body);
  });
}

/** Charges a booking that already exists -- the initial checkout pass and a payment retry both call this the same way. */
export async function chargeBookingAction({ bookingId, amount, method, gateway }) {
  return withActionResult(async () => {
    const user = await requireActionUser();
    bookingLimit(await getActionRequestLike(), 'payments');
    requirePermission(user, 'payments.create');
    const body = parse('body', { bookingId, amount, method, gateway }, createPaymentSchema);
    return paymentService.recordPaymentForUser(user, body);
  });
}

export async function confirmBookingAction(id) {
  return withActionResult(async () => {
    const user = await requireActionUser();
    requirePermission(user, 'bookings.confirm');
    const { id: bookingId } = parse('params', { id }, idParamSchema);
    return bookingService.confirmBookingAfterPayment(bookingId, { changedById: user.id });
  });
}

export async function checkInBookingAction(id, notes) {
  return withActionResult(async () => {
    const user = await requireActionUser();
    requirePermission(user, 'bookings.checkin');
    const { id: bookingId } = parse('params', { id }, idParamSchema);
    const body = parse('body', { notes }, checkInOutSchema);
    return bookingService.checkInBooking(bookingId, { staffUserId: user.id, notes: body.notes });
  });
}

export async function checkOutBookingAction(id, notes) {
  return withActionResult(async () => {
    const user = await requireActionUser();
    requirePermission(user, 'bookings.checkout');
    const { id: bookingId } = parse('params', { id }, idParamSchema);
    const body = parse('body', { notes }, checkInOutSchema);
    return bookingService.checkOutBooking(bookingId, { staffUserId: user.id, notes: body.notes });
  });
}

export async function cancelBookingAction(id, reason) {
  return withActionResult(async () => {
    const user = await requireActionUser();
    requirePermission(user, 'bookings.cancel');
    const { id: bookingId } = parse('params', { id }, idParamSchema);
    const body = parse('body', { reason }, cancelBookingSchema);
    return bookingService.cancelBooking(bookingId, { reason: body.reason, changedById: user.id });
  });
}
