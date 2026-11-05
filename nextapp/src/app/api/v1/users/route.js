import { apiHandler } from '../../../../server/lib/apiHandler.js';
import { parseBody, parseQuery } from '../../../../server/lib/parseRequest.js';
import { paginated, created } from '../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../server/middleware/withPermission.js';
import { parsePagination } from '../../../../server/utils/pagination.js';
import { createUserSchema, listUsersQuerySchema } from '../../../../server/validators/user.validators.js';
import * as userService from '../../../../server/services/userService.js';

export const GET = apiHandler(async (request) => {
  const user = await withAuth(request);
  requirePermission(user, 'users.view');
  const query = parseQuery(request, listUsersQuerySchema);
  const { page, limit, skip } = parsePagination(query);
  const { items, total } = await userService.listUsers({ ...query, page, limit, skip, excludeUserId: user.id });
  return paginated({ items, page, limit, total });
});

export const POST = apiHandler(async (request) => {
  const user = await withAuth(request);
  requirePermission(user, 'users.create');
  const body = await parseBody(request, createUserSchema);
  const newUser = await userService.createUser(body, user.id);
  return created(newUser, 'User created');
});
