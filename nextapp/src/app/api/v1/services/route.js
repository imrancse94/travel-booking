import { apiHandler } from '../../../../server/lib/apiHandler.js';
import { parseBody, parseQuery } from '../../../../server/lib/parseRequest.js';
import { paginated, created } from '../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../server/middleware/withPermission.js';
import { parsePagination } from '../../../../server/utils/pagination.js';
import { createServiceSchema, listServicesQuerySchema } from '../../../../server/validators/service.validators.js';
import * as serviceCatalogService from '../../../../server/services/serviceCatalogService.js';

// Public, so the customer-facing checkout can offer these services.
export const GET = apiHandler(async (request) => {
  const query = parseQuery(request, listServicesQuerySchema);
  const { page, limit, skip } = parsePagination(query);
  const { items, total } = await serviceCatalogService.listServices({ ...query, page, limit, skip });
  return paginated({ items, page, limit, total });
});

export const POST = apiHandler(async (request) => {
  const user = await withAuth(request);
  requirePermission(user, 'services.create');
  const body = await parseBody(request, createServiceSchema);
  const service = await serviceCatalogService.createService(body, user.id);
  return created(service, 'Service created');
});
