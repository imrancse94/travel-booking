import { apiHandler } from '../../../../server/lib/apiHandler.js';
import { parseBody, parseQuery } from '../../../../server/lib/parseRequest.js';
import { paginated, created } from '../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../server/middleware/withPermission.js';
import { parsePagination } from '../../../../server/utils/pagination.js';
import { createAmenitySchema, listAmenitiesQuerySchema } from '../../../../server/validators/amenity.validators.js';
import * as amenityService from '../../../../server/services/amenityService.js';

export const GET = apiHandler(async (request) => {
  const user = await withAuth(request);
  requirePermission(user, 'amenities.view');
  const query = parseQuery(request, listAmenitiesQuerySchema);
  const { page, limit, skip } = parsePagination(query);
  const { items, total } = await amenityService.listAmenities({ ...query, page, limit, skip });
  return paginated({ items, page, limit, total });
});

export const POST = apiHandler(async (request) => {
  const user = await withAuth(request);
  requirePermission(user, 'amenities.create');
  const body = await parseBody(request, createAmenitySchema);
  const amenity = await amenityService.createAmenity(body, user.id);
  return created(amenity, 'Amenity created');
});
