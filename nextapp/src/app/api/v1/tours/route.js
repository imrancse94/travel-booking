import { apiHandler } from '../../../../server/lib/apiHandler.js';
import { parseBody, parseQuery } from '../../../../server/lib/parseRequest.js';
import { paginated, created } from '../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../server/middleware/withPermission.js';
import { parsePagination } from '../../../../server/utils/pagination.js';
import {
  createTourPackageSchema,
  listTourPackagesQuerySchema,
} from '../../../../server/validators/tourPackage.validators.js';
import * as tourPackageService from '../../../../server/services/tourPackageService.js';

// Public, customer-facing catalog read.
export const GET = apiHandler(async (request) => {
  const query = parseQuery(request, listTourPackagesQuerySchema);
  const { page, limit, skip } = parsePagination(query);
  const { items, total } = await tourPackageService.listTourPackages({ ...query, page, limit, skip });
  return paginated({ items, page, limit, total });
});

export const POST = apiHandler(async (request) => {
  const user = await withAuth(request);
  requirePermission(user, 'tours.create');
  const body = await parseBody(request, createTourPackageSchema);
  const tourPackage = await tourPackageService.createTourPackage(body, user.id);
  return created(tourPackage, 'Tour package created');
});
