import { prisma } from '../config/prisma.js';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors.js';
import { Money } from '../utils/money.js';
import { recordAudit } from './auditService.js';
import * as commissionRepository from '../repositories/commissionRepository.js';

// Commissions are created automatically inside bookingService.createBooking
// when a booking has an agent + effective commission percent. This service
// covers the admin-facing view/management: listing, and moving a commission
// through its lifecycle (pending -> approved -> paid), plus manual creation
// for adjustments.

const ALLOWED_TRANSITIONS = {
  pending: ['approved', 'cancelled'],
  approved: ['paid', 'cancelled'],
  paid: [],
  cancelled: [],
};

export async function listCommissions(query) {
  const { items, total } = await commissionRepository.list(query);
  return { items, total };
}

export async function getCommission(id) {
  const commission = await commissionRepository.findById(id);
  if (!commission) throw new NotFoundError('Commission not found');
  return commission;
}

export async function createCommission({ agentId, bookingId, percentage, amount }, actorId) {
  const [agent, booking] = await Promise.all([
    prisma.user.findUnique({ where: { id: agentId } }),
    prisma.booking.findUnique({ where: { id: bookingId } }),
  ]);
  if (!agent) throw new NotFoundError('Agent not found');
  if (!booking) throw new NotFoundError('Booking not found');

  const resolvedAmount =
    amount !== undefined ? new Money(amount) : new Money(booking.subtotal).minus(booking.discountAmount).times(new Money(percentage).dividedBy(100));

  const commission = await commissionRepository.create({
    agentId,
    bookingId,
    percentage: new Money(percentage).toString(),
    amount: resolvedAmount.toDecimalPlaces(2).toString(),
    status: 'pending',
  });

  await recordAudit({
    userId: actorId,
    action: 'commission.created',
    entity: 'Commission',
    entityId: commission.id,
    newValue: { agentId, bookingId, percentage, amount: commission.amount.toString() },
  });

  return commission;
}

export async function updateCommissionStatus(id, { status, paidAt }, actorId) {
  const existing = await getCommission(id);

  const allowed = ALLOWED_TRANSITIONS[existing.status] || [];
  if (!allowed.includes(status)) {
    throw new ConflictError(`Cannot transition commission from ${existing.status} to ${status}`);
  }

  if (status === 'paid' && paidAt && Number.isNaN(Date.parse(paidAt))) {
    throw new ValidationError('Invalid paidAt date');
  }

  const data = { status };
  if (status === 'paid') {
    data.paidAt = paidAt ? new Date(paidAt) : new Date();
  }

  const updated = await commissionRepository.updateStatus(id, data);

  await recordAudit({
    userId: actorId,
    action: 'commission.status_updated',
    entity: 'Commission',
    entityId: id,
    oldValue: { status: existing.status },
    newValue: { status: updated.status, paidAt: updated.paidAt },
  });

  return updated;
}
