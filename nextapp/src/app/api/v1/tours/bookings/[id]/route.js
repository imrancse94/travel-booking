import { apiHandler } from '../../../../../../server/lib/apiHandler.js';
import { parseParams } from '../../../../../../server/lib/parseRequest.js';
import { success } from '../../../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../../../server/middleware/withAuth.js';
import { idParamSchema } from '../../../../../../server/validators/tourBooking.validators.js';
import * as tourBookingService from '../../../../../../server/services/tourBookingService.js';
import { AuthorizationError } from '../../../../../../server/utils/errors.js';

export const GET = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  const params = parseParams(await ctx.params, idParamSchema);
  const booking = await tourBookingService.getTourBooking(params.id);

  const isOwner = user.roles.includes('Customer') && booking.customer?.userId === user.id;
  const isStaff = user.roles.some((r) => r !== 'Customer');
  if (!isOwner && !isStaff) throw new AuthorizationError();

  return success({ data: booking });
});
