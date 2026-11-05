import { apiHandler } from '../../../../../../server/lib/apiHandler.js';
import { parseBody, parseParams } from '../../../../../../server/lib/parseRequest.js';
import { created } from '../../../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../../../server/middleware/withPermission.js';
import { idParamSchema, addHotelImageSchema } from '../../../../../../server/validators/hotel.validators.js';
import * as hotelService from '../../../../../../server/services/hotelService.js';

export const POST = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'hotels.update');
  const { id } = parseParams(await ctx.params, idParamSchema);
  const body = await parseBody(request, addHotelImageSchema);
  const image = await hotelService.addHotelImage(id, body, user.id);
  return created(image, 'Hotel image added');
});
