import { apiHandler } from '../../../../server/lib/apiHandler.js';
import { parseBody, parseQuery } from '../../../../server/lib/parseRequest.js';
import { paginated, created } from '../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../server/middleware/withPermission.js';
import { parsePagination } from '../../../../server/utils/pagination.js';
import { createHotelSchema, listHotelsQuerySchema } from '../../../../server/validators/hotel.validators.js';
import * as hotelService from '../../../../server/services/hotelService.js';

export const GET = apiHandler(async (request) => {
  const query = parseQuery(request, listHotelsQuerySchema);
  const { page, limit, skip } = parsePagination(query);
  const { items, total } = await hotelService.listHotels({ ...query, page, limit, skip });
  return paginated({ items, page, limit, total });
});

export const POST = apiHandler(async (request) => {
  const user = await withAuth(request);
  requirePermission(user, 'hotels.create');
  const body = await parseBody(request, createHotelSchema);
  const hotel = await hotelService.createHotel(body, user.id);
  return created(hotel, 'Hotel created');
});
