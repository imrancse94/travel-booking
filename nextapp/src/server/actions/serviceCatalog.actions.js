'use server';

import { withActionResult } from './_actionResult.js';
import { requireActionUser } from './_actionAuth.js';
import { requirePermission } from '../middleware/withPermission.js';
import { parse } from '../lib/parseRequest.js';
import { createServiceSchema, updateServiceSchema } from '../validators/service.validators.js';
import * as serviceCatalogService from '../services/serviceCatalogService.js';

export async function saveServiceAction({ id, payload }) {
  return withActionResult(async () => {
    const user = await requireActionUser();
    requirePermission(user, id ? 'services.update' : 'services.create');

    return id
      ? serviceCatalogService.updateService(id, parse('body', payload, updateServiceSchema), user.id)
      : serviceCatalogService.createService(parse('body', payload, createServiceSchema), user.id);
  });
}

export async function deleteServiceAction(id) {
  return withActionResult(async () => {
    const user = await requireActionUser();
    requirePermission(user, 'services.delete');
    return serviceCatalogService.deleteService(id, user.id);
  });
}
