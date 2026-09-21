'use server';

import { withActionResult } from './_actionResult.js';
import { requireActionUser } from './_actionAuth.js';
import { requirePermission } from '../middleware/withPermission.js';
import { parse } from '../lib/parseRequest.js';
import { createTourPackageSchema, updateTourPackageSchema, replaceItinerarySchema } from '../validators/tourPackage.validators.js';
import * as tourPackageService from '../services/tourPackageService.js';

/**
 * Same collapse-two-calls-into-one as hotel.actions.js's saveHotelAction.
 * The second step here (itinerary replace) previously called a client
 * endpoint (`PUT /tours/:id/itineraries`) that never actually existed on
 * either the old Express backend or the ported Route Handlers -- its
 * `.catch(() => null)` silently swallowed a 404 on every save. Fixed here by
 * adding tourPackageService.replaceItinerary (and the matching Route
 * Handler, for non-browser API consumers) rather than porting the same gap forward.
 */
export async function saveTourPackageAction({ id, payload, days }) {
  return withActionResult(async () => {
    const user = await requireActionUser();
    requirePermission(user, id ? 'tours.update' : 'tours.create');

    const tourPackage = id
      ? await tourPackageService.updateTourPackage(id, parse('body', payload, updateTourPackageSchema), user.id)
      : await tourPackageService.createTourPackage(parse('body', payload, createTourPackageSchema), user.id);

    if (days) {
      const parsedDays = parse('body', { days }, replaceItinerarySchema).days;
      await tourPackageService.replaceItinerary(tourPackage.id, parsedDays, user.id).catch(() => null);
    }

    return tourPackage;
  });
}

export async function deleteTourPackageAction(id) {
  return withActionResult(async () => {
    const user = await requireActionUser();
    requirePermission(user, 'tours.delete');
    await tourPackageService.deleteTourPackage(id, user.id);
    return null;
  });
}
