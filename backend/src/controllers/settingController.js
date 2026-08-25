import { asyncHandler } from '../utils/asyncHandler.js';
import { success } from '../utils/apiResponse.js';
import * as settingsService from '../services/settingsService.js';
import { recordAudit } from '../services/auditService.js';

export const getSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.getSettings(req.user.agencyId ?? null);
  return success(res, { data: settings });
});

// PUT /settings -- body is either { key, value } for a single setting, or
// { updates: [{ key, value }, ...] } to update several at once.
export const updateSettings = asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId ?? null;
  const entries = 'updates' in req.body ? req.body.updates : [{ key: req.body.key, value: req.body.value }];

  for (const { key, value } of entries) {
    const row = await settingsService.setSetting(key, value, agencyId);
    // eslint-disable-next-line no-await-in-loop -- small, request-bounded batch of settings
    await recordAudit({ req, action: 'setting.updated', entity: 'Setting', entityId: row.id, newValue: { key, value } });
  }

  const settings = await settingsService.getSettings(agencyId);
  return success(res, { data: settings, message: 'Settings updated' });
});
