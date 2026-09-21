import { apiHandler } from '../../../../../../../server/lib/apiHandler.js';
import { parseParams } from '../../../../../../../server/lib/parseRequest.js';
import { success } from '../../../../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../../../../server/middleware/withPermission.js';
import { documentParamSchema } from '../../../../../../../server/validators/customer.validators.js';
import * as customerService from '../../../../../../../server/services/customerService.js';

export const DELETE = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'customers.update');
  const { id, documentId } = parseParams(await ctx.params, documentParamSchema);
  await customerService.removeDocument(id, documentId, user.id);
  return success({ message: 'Document removed' });
});
