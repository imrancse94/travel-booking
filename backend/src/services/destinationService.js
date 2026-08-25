import { NotFoundError, ConflictError } from '../utils/errors.js';
import * as destinationRepository from '../repositories/destinationRepository.js';
import { recordAudit } from './auditService.js';

export async function listDestinations(query) {
  const { items, total } = await destinationRepository.list(query);
  return { items, total };
}

export async function getDestination(id) {
  const destination = await destinationRepository.findByIdWithTours(id);
  if (!destination) throw new NotFoundError('Destination not found');
  return destination;
}

export async function createDestination(data, actorId) {
  const destination = await destinationRepository.create(data);
  await recordAudit({ userId: actorId, action: 'destination.created', entity: 'Destination', entityId: destination.id, newValue: data });
  return destination;
}

export async function updateDestination(id, data, actorId) {
  const existing = await destinationRepository.findById(id);
  if (!existing) throw new NotFoundError('Destination not found');

  const updated = await destinationRepository.update(id, data);
  await recordAudit({ userId: actorId, action: 'destination.updated', entity: 'Destination', entityId: id, oldValue: existing, newValue: data });
  return updated;
}

export async function deleteDestination(id, actorId) {
  const existing = await destinationRepository.findById(id);
  if (!existing) throw new NotFoundError('Destination not found');

  const activeTours = await destinationRepository.findByIdWithTours(id);
  if (activeTours.tourPackages.some((t) => t.status === 'active')) {
    throw new ConflictError('Cannot delete a destination that still has active tour packages');
  }

  await destinationRepository.softDelete(id);
  await recordAudit({ userId: actorId, action: 'destination.deleted', entity: 'Destination', entityId: id });
}
