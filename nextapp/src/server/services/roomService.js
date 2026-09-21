import * as roomRepository from '../repositories/roomRepository.js';
import * as roomTypeRepository from '../repositories/roomTypeRepository.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import { BLOCKING_BOOKING_STATUSES } from './availabilityService.js';
import { recordAudit } from './auditService.js';

const OUT_OF_SERVICE_STATUSES = ['maintenance', 'inactive'];

export async function listRooms(query) {
  return roomRepository.list(query);
}

export async function getRoom(id) {
  const room = await roomRepository.findById(id);
  if (!room) throw new NotFoundError('Room not found');
  return room;
}

export async function createRoom(data, actorId) {
  const roomType = await roomTypeRepository.findByIdRaw(data.roomTypeId);
  if (!roomType) throw new NotFoundError('Room type not found');

  const room = await roomRepository.create(data);
  await recordAudit({
    userId: actorId,
    action: 'room.created',
    entity: 'Room',
    entityId: room.id,
    newValue: { roomNumber: room.roomNumber, roomTypeId: data.roomTypeId },
  });
  return room;
}

// Rooms with a currently- or future-active booking (held/confirmed/checked_in) can never be
// taken out of service, otherwise a guest who is due to arrive would find no room available.
async function assertNoBlockingBookings(roomId) {
  const blocking = await roomRepository.findActiveBlockingBookings(roomId, BLOCKING_BOOKING_STATUSES);
  if (blocking.length > 0) {
    throw new ConflictError(
      'Room has an active booking (held, confirmed, or checked-in) that has not yet checked out and cannot be taken out of service'
    );
  }
}

export async function updateRoom(id, data, actorId) {
  const existing = await roomRepository.findByIdRaw(id);
  if (!existing) throw new NotFoundError('Room not found');

  if (data.status && OUT_OF_SERVICE_STATUSES.includes(data.status) && data.status !== existing.status) {
    await assertNoBlockingBookings(id);
  }

  const updated = await roomRepository.update(id, data);
  await recordAudit({ userId: actorId, action: 'room.updated', entity: 'Room', entityId: id, oldValue: existing, newValue: data });
  return updated;
}

export async function deleteRoom(id, actorId) {
  const existing = await roomRepository.findByIdRaw(id);
  if (!existing) throw new NotFoundError('Room not found');

  await assertNoBlockingBookings(id);
  await roomRepository.softDelete(id);
  await recordAudit({ userId: actorId, action: 'room.deleted', entity: 'Room', entityId: id });
}
