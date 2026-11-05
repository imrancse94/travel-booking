import { ConflictError, NotFoundError } from '../utils/errors.js';
import * as serviceRepository from '../repositories/serviceRepository.js';
import { recordAudit } from './auditService.js';

// Manages the catalog of extra/add-on services (airport pickup, breakfast,
// extra bed, ...) that can be attached to a booking. Attaching a service to
// a booking itself happens inside bookingService.createBooking.

export async function listServices(query) {
  const { items, total } = await serviceRepository.list(query);
  return { items, total };
}

export async function getService(id) {
  const service = await serviceRepository.findById(id);
  if (!service) throw new NotFoundError('Service not found');
  return service;
}

export async function createService(data, actorId) {
  const service = await serviceRepository.create(data);
  await recordAudit({
    userId: actorId,
    action: 'service.created',
    entity: 'Service',
    entityId: service.id,
    newValue: data,
  });
  return service;
}

export async function updateService(id, data, actorId) {
  const existing = await getService(id);
  const updated = await serviceRepository.update(id, data);
  await recordAudit({
    userId: actorId,
    action: 'service.updated',
    entity: 'Service',
    entityId: id,
    oldValue: existing,
    newValue: data,
  });
  return updated;
}

export async function deleteService(id, actorId) {
  await getService(id);

  const usageCount = await serviceRepository.countBookingUsage(id);
  if (usageCount > 0) {
    // Preserve historical booking_services rows -- deactivate instead of a
    // hard delete when the service has already been attached to bookings.
    const deactivated = await serviceRepository.update(id, { status: 'inactive' });
    await recordAudit({
      userId: actorId,
      action: 'service.deactivated',
      entity: 'Service',
      entityId: id,
      newValue: { status: 'inactive', reason: 'in use by existing bookings' },
    });
    return deactivated;
  }

  await serviceRepository.remove(id).catch(() => {
    throw new ConflictError('Service could not be deleted because it is referenced by existing records');
  });
  await recordAudit({ userId: actorId, action: 'service.deleted', entity: 'Service', entityId: id });
  return null;
}
