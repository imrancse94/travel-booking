'use server';

import { withActionResult } from './_actionResult.js';
import { requireActionUser } from './_actionAuth.js';
import { requirePermission } from '../middleware/withPermission.js';
import { parse } from '../lib/parseRequest.js';
import { createAmenitySchema, updateAmenitySchema } from '../validators/amenity.validators.js';
import * as amenityService from '../services/amenityService.js';

export async function saveAmenityAction({ id, payload }) {
  return withActionResult(async () => {
    const user = await requireActionUser();
    requirePermission(user, id ? 'amenities.update' : 'amenities.create');
    return id
      ? amenityService.updateAmenity(id, parse('body', payload, updateAmenitySchema), user.id)
      : amenityService.createAmenity(parse('body', payload, createAmenitySchema), user.id);
  });
}

export async function deleteAmenityAction(id) {
  return withActionResult(async () => {
    const user = await requireActionUser();
    requirePermission(user, 'amenities.delete');
    await amenityService.deleteAmenity(id, user.id);
    return null;
  });
}
