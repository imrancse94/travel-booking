import * as ratePlanRepository from '../repositories/ratePlanRepository.js';
import * as roomTypeRepository from '../repositories/roomTypeRepository.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { roundCurrency } from '../utils/money.js';
import { recordAudit } from './auditService.js';

export async function listRatePlans(query) {
  return ratePlanRepository.list(query);
}

export async function getRatePlan(id) {
  const plan = await ratePlanRepository.findById(id);
  if (!plan) throw new NotFoundError('Rate plan not found');
  return plan;
}

export async function createRatePlan(data, actorId) {
  const plan = await ratePlanRepository.create(data);
  await recordAudit({ userId: actorId, action: 'rate_plan.created', entity: 'RatePlan', entityId: plan.id, newValue: { name: plan.name, type: plan.type } });
  return plan;
}

export async function updateRatePlan(id, data, actorId) {
  const existing = await ratePlanRepository.findById(id);
  if (!existing) throw new NotFoundError('Rate plan not found');

  const updated = await ratePlanRepository.update(id, data);
  await recordAudit({ userId: actorId, action: 'rate_plan.updated', entity: 'RatePlan', entityId: id, oldValue: existing, newValue: data });
  return updated;
}

export async function deleteRatePlan(id, actorId) {
  const existing = await ratePlanRepository.findById(id);
  if (!existing) throw new NotFoundError('Rate plan not found');

  await ratePlanRepository.remove(id);
  await recordAudit({ userId: actorId, action: 'rate_plan.deleted', entity: 'RatePlan', entityId: id });
}

function assertDateRange(startDate, endDate) {
  if (new Date(endDate) <= new Date(startDate)) {
    throw new ValidationError('End date must be after start date');
  }
}

export async function listRatesForRoomType(roomTypeId, query) {
  const roomType = await roomTypeRepository.findByIdRaw(roomTypeId);
  if (!roomType) throw new NotFoundError('Room type not found');

  return ratePlanRepository.listRoomRatesForRoomType(roomTypeId, query);
}

/** The un-nested /rate-plans/room-rates listing: every room type when `roomTypeId` is omitted. */
export async function listRoomRates({ roomTypeId, ...query }) {
  if (roomTypeId) {
    const roomType = await roomTypeRepository.findByIdRaw(roomTypeId);
    if (!roomType) throw new NotFoundError('Room type not found');
  }
  return ratePlanRepository.listRoomRates({ roomTypeId, ...query });
}

export async function createRoomRate(roomTypeId, data, actorId) {
  const roomType = await roomTypeRepository.findByIdRaw(roomTypeId);
  if (!roomType) throw new NotFoundError('Room type not found');

  const ratePlan = await ratePlanRepository.findById(data.ratePlanId);
  if (!ratePlan) throw new NotFoundError('Rate plan not found');

  assertDateRange(data.startDate, data.endDate);

  // All monetary inputs are routed through Money/roundCurrency before hitting the DB,
  // never trusting raw floats from the request body.
  const price = roundCurrency(data.price);
  const extraAdultPrice = roundCurrency(data.extraAdultPrice ?? 0);
  const extraChildPrice = roundCurrency(data.extraChildPrice ?? 0);

  const rate = await ratePlanRepository.createRoomRate({
    roomTypeId,
    ratePlanId: data.ratePlanId,
    startDate: new Date(data.startDate),
    endDate: new Date(data.endDate),
    price: price.toString(),
    extraAdultPrice: extraAdultPrice.toString(),
    extraChildPrice: extraChildPrice.toString(),
    currency: data.currency ?? 'USD',
    priority: data.priority ?? 0,
  });

  await recordAudit({
    userId: actorId,
    action: 'room_rate.created',
    entity: 'RoomRate',
    entityId: rate.id,
    newValue: { roomTypeId, ratePlanId: data.ratePlanId, price: price.toString() },
  });
  return rate;
}

export async function getRoomRate(id) {
  const rate = await ratePlanRepository.findRoomRateById(id);
  if (!rate) throw new NotFoundError('Room rate not found');
  return rate;
}

export async function updateRoomRate(id, data, actorId) {
  const existing = await ratePlanRepository.findRoomRateById(id);
  if (!existing) throw new NotFoundError('Room rate not found');

  if (data.ratePlanId) {
    const ratePlan = await ratePlanRepository.findById(data.ratePlanId);
    if (!ratePlan) throw new NotFoundError('Rate plan not found');
  }

  const startDate = data.startDate ?? existing.startDate;
  const endDate = data.endDate ?? existing.endDate;
  assertDateRange(startDate, endDate);

  const updateData = { ...data };
  if (data.startDate) updateData.startDate = new Date(data.startDate);
  if (data.endDate) updateData.endDate = new Date(data.endDate);
  if (data.price !== undefined) updateData.price = roundCurrency(data.price).toString();
  if (data.extraAdultPrice !== undefined) updateData.extraAdultPrice = roundCurrency(data.extraAdultPrice).toString();
  if (data.extraChildPrice !== undefined) updateData.extraChildPrice = roundCurrency(data.extraChildPrice).toString();

  const updated = await ratePlanRepository.updateRoomRate(id, updateData);
  await recordAudit({ userId: actorId, action: 'room_rate.updated', entity: 'RoomRate', entityId: id, oldValue: existing, newValue: data });
  return updated;
}

export async function deleteRoomRate(id, actorId) {
  const existing = await ratePlanRepository.findRoomRateById(id);
  if (!existing) throw new NotFoundError('Room rate not found');

  await ratePlanRepository.removeRoomRate(id);
  await recordAudit({ userId: actorId, action: 'room_rate.deleted', entity: 'RoomRate', entityId: id });
}
