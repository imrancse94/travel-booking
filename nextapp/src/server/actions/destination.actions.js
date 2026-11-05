'use server';

import { withActionResult } from './_actionResult.js';
import { requireActionUser } from './_actionAuth.js';
import { requirePermission } from '../middleware/withPermission.js';
import { parse } from '../lib/parseRequest.js';
import { createDestinationSchema, updateDestinationSchema } from '../validators/destination.validators.js';
import * as destinationService from '../services/destinationService.js';

export async function saveDestinationAction({ id, payload }) {
  return withActionResult(async () => {
    const user = await requireActionUser();
    requirePermission(user, id ? 'destinations.update' : 'destinations.create');

    return id
      ? destinationService.updateDestination(id, parse('body', payload, updateDestinationSchema), user.id)
      : destinationService.createDestination(parse('body', payload, createDestinationSchema), user.id);
  });
}

export async function deleteDestinationAction(id) {
  return withActionResult(async () => {
    const user = await requireActionUser();
    requirePermission(user, 'destinations.delete');
    await destinationService.deleteDestination(id, user.id);
    return null;
  });
}
