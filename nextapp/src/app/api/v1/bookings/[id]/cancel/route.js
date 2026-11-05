import { apiHandler } from '../../../../../../server/lib/apiHandler.js';
import { parseBody, parseParams } from '../../../../../../server/lib/parseRequest.js';
import { success } from '../../../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../../../server/middleware/withPermission.js';
import { idParamSchema, cancelBookingSchema } from '../../../../../../server/validators/booking.validators.js';
import * as bookingService from '../../../../../../server/services/bookingService.js';

export const POST = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'bookings.cancel');
  const { id } = parseParams(await ctx.params, idParamSchema);
  const body = await parseBody(request, cancelBookingSchema);
  const booking = await bookingService.cancelBooking(id, { reason: body.reason, changedById: user.id });
  return success({ data: booking, message: 'Booking cancelled' });
});
