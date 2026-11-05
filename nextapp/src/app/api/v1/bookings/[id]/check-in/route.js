import { apiHandler } from '../../../../../../server/lib/apiHandler.js';
import { parseBody, parseParams } from '../../../../../../server/lib/parseRequest.js';
import { success } from '../../../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../../../server/middleware/withPermission.js';
import { idParamSchema, checkInOutSchema } from '../../../../../../server/validators/booking.validators.js';
import * as bookingService from '../../../../../../server/services/bookingService.js';

export const POST = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'bookings.checkin');
  const { id } = parseParams(await ctx.params, idParamSchema);
  const body = await parseBody(request, checkInOutSchema);
  const booking = await bookingService.checkInBooking(id, { staffUserId: user.id, notes: body.notes });
  return success({ data: booking, message: 'Guest checked in' });
});
