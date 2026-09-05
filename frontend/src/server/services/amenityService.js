import * as amenityRepository from '../repositories/amenityRepository.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import { recordAudit } from './auditService.js';

export async function listAmenities(query) {
  return amenityRepository.list(query);
}

export async function getAmenity(id) {
  const amenity = await amenityRepository.findById(id);
  if (!amenity) throw new NotFoundError('Amenity not found');
  return amenity;
}

export async function createAmenity(data, actorId) {
  const existing = await amenityRepository.findByName(data.name);
  if (existing) throw new ConflictError('An amenity with this name already exists');

  const amenity = await amenityRepository.create(data);
  await recordAudit({ userId: actorId, action: 'amenity.created', entity: 'Amenity', entityId: amenity.id, newValue: { name: amenity.name } });
  return amenity;
}

export async function updateAmenity(id, data, actorId) {
  const existing = await amenityRepository.findById(id);
  if (!existing) throw new NotFoundError('Amenity not found');

  if (data.name && data.name !== existing.name) {
    const clash = await amenityRepository.findByName(data.name);
    if (clash) throw new ConflictError('An amenity with this name already exists');
  }

  const updated = await amenityRepository.update(id, data);
  await recordAudit({ userId: actorId, action: 'amenity.updated', entity: 'Amenity', entityId: id, oldValue: existing, newValue: data });
  return updated;
}

export async function deleteAmenity(id, actorId) {
  const existing = await amenityRepository.findById(id);
  if (!existing) throw new NotFoundError('Amenity not found');

  await amenityRepository.remove(id);
  await recordAudit({ userId: actorId, action: 'amenity.deleted', entity: 'Amenity', entityId: id });
}
