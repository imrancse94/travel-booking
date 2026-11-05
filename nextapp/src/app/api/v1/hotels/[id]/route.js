import { apiHandler } from '../../../../../server/lib/apiHandler.js';
import { parseBody, parseParams } from '../../../../../server/lib/parseRequest.js';
import { success } from '../../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../../server/middleware/withPermission.js';
import { idParamSchema, updateHotelSchema } from '../../../../../server/validators/hotel.validators.js';
import * as hotelService from '../../../../../server/services/hotelService.js';

export const GET = apiHandler(async (request, ctx) => {
  const { id } = parseParams(await ctx.params, idParamSchema);
  const hotel = await hotelService.getHotel(id);
  return success({ data: hotel });
});

export const PUT = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'hotels.update');
  const { id } = parseParams(await ctx.params, idParamSchema);
  const body = await parseBody(request, updateHotelSchema);
  const hotel = await hotelService.updateHotel(id, body, user.id);
  return success({ data: hotel, message: 'Hotel updated' });
});

export const DELETE = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'hotels.delete');
  const { id } = parseParams(await ctx.params, idParamSchema);
  await hotelService.deleteHotel(id, user.id);
  return success({ message: 'Hotel deleted' });
});
