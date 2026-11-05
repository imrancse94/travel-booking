import { apiHandler } from '../../../../../../server/lib/apiHandler.js';
import { parseBody, parseParams } from '../../../../../../server/lib/parseRequest.js';
import { success, created } from '../../../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../../../server/middleware/withPermission.js';
import { createCustomerDocumentSchema, idParamSchema } from '../../../../../../server/validators/customer.validators.js';
import * as customerService from '../../../../../../server/services/customerService.js';

export const GET = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'customers.view');
  const { id } = parseParams(await ctx.params, idParamSchema);
  const documents = await customerService.listDocuments(id);
  return success({ data: documents });
});

export const POST = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'customers.update');
  const { id } = parseParams(await ctx.params, idParamSchema);
  const body = await parseBody(request, createCustomerDocumentSchema);
  const document = await customerService.addDocument(id, body, user.id);
  return created(document, 'Document added');
});
