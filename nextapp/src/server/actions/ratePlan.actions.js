'use server';

import { withActionResult } from './_actionResult.js';
import { requireActionUser } from './_actionAuth.js';
import { requirePermission } from '../middleware/withPermission.js';
import { parse } from '../lib/parseRequest.js';
import {
  createRatePlanSchema,
  updateRatePlanSchema,
  createGeneralRoomRateSchema,
  updateRoomRateSchema,
} from '../validators/ratePlan.validators.js';
import * as ratePlanService from '../services/ratePlanService.js';

export async function saveRatePlanAction({ id, payload }) {
  return withActionResult(async () => {
    const user = await requireActionUser();
    requirePermission(user, id ? 'rate_plans.update' : 'rate_plans.create');

    return id
      ? ratePlanService.updateRatePlan(id, parse('body', payload, updateRatePlanSchema), user.id)
      : ratePlanService.createRatePlan(parse('body', payload, createRatePlanSchema), user.id);
  });
}

export async function deleteRatePlanAction(id) {
  return withActionResult(async () => {
    const user = await requireActionUser();
    requirePermission(user, 'rate_plans.delete');
    await ratePlanService.deleteRatePlan(id, user.id);
    return null;
  });
}

export async function saveRoomRateAction({ id, payload }) {
  return withActionResult(async () => {
    const user = await requireActionUser();
    requirePermission(user, id ? 'rate_plans.update' : 'rate_plans.create');

    if (id) {
      return ratePlanService.updateRoomRate(id, parse('body', payload, updateRoomRateSchema), user.id);
    }

    const { roomTypeId, ...data } = parse('body', payload, createGeneralRoomRateSchema);
    return ratePlanService.createRoomRate(roomTypeId, data, user.id);
  });
}

export async function deleteRoomRateAction(id) {
  return withActionResult(async () => {
    const user = await requireActionUser();
    requirePermission(user, 'rate_plans.delete');
    await ratePlanService.deleteRoomRate(id, user.id);
    return null;
  });
}
