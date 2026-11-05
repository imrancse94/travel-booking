import { apiHandler } from '../../../../../../../server/lib/apiHandler.js';
import { parseBody, parseParams } from '../../../../../../../server/lib/parseRequest.js';
import { success } from '../../../../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../../../../server/middleware/withPermission.js';
import { idParamSchema, cancelTourBookingSchema } from '../../../../../../../server/validators/tourBooking.validators.js';
import * as tourBookingService from '../../../../../../../server/services/tourBookingService.js';

export const POST = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'tour_bookings.update');
  const params = parseParams(await ctx.params, idParamSchema);
  await parseBody(request, cancelTourBookingSchema);
  const booking = await tourBookingService.cancelTourBooking(params.id, user.id);
  return success({ data: booking, message: 'Tour booking cancelled' });
});
