import { apiHandler } from '../../../../server/lib/apiHandler.js';
import { parseBody, parseQuery } from '../../../../server/lib/parseRequest.js';
import { paginated, created } from '../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../server/middleware/withPermission.js';
import { parsePagination } from '../../../../server/utils/pagination.js';
import {
  createDestinationSchema,
  listDestinationsQuerySchema,
} from '../../../../server/validators/destination.validators.js';
import * as destinationService from '../../../../server/services/destinationService.js';

// Public, customer-facing.
export const GET = apiHandler(async (request) => {
  const query = parseQuery(request, listDestinationsQuerySchema);
  const { page, limit, skip } = parsePagination(query);
  const { items, total } = await destinationService.listDestinations({ ...query, page, limit, skip });
  return paginated({ items, page, limit, total });
});

export const POST = apiHandler(async (request) => {
  const user = await withAuth(request);
  requirePermission(user, 'destinations.create');
  const body = await parseBody(request, createDestinationSchema);
  const destination = await destinationService.createDestination(body, user.id);
  return created(destination, 'Destination created');
});
