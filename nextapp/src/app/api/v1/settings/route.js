import { apiHandler } from '../../../../server/lib/apiHandler.js';
import { parseBody } from '../../../../server/lib/parseRequest.js';
import { success } from '../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../server/middleware/withPermission.js';
import { updateSettingSchema } from '../../../../server/validators/setting.validators.js';
import * as settingsService from '../../../../server/services/settingsService.js';
import { recordAudit } from '../../../../server/services/auditService.js';

export const GET = apiHandler(async (request) => {
  const user = await withAuth(request);
  requirePermission(user, 'settings.view');
  const settings = await settingsService.getSettings(user.agencyId ?? null);
  return success({ data: settings });
});

export const PUT = apiHandler(async (request) => {
  const user = await withAuth(request);
  requirePermission(user, 'settings.update');
  const body = await parseBody(request, updateSettingSchema);
  const agencyId = user.agencyId ?? null;
  const entries = 'updates' in body ? body.updates : [{ key: body.key, value: body.value }];

  for (const { key, value } of entries) {
    const row = await settingsService.setSetting(key, value, agencyId);
    // eslint-disable-next-line no-await-in-loop -- small, request-bounded batch of settings
    await recordAudit({ userId: user.id, action: 'setting.updated', entity: 'Setting', entityId: row.id, newValue: { key, value } });
  }

  const settings = await settingsService.getSettings(agencyId);
  return success({ data: settings, message: 'Settings updated' });
});
