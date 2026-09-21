'use server';

import { withActionResult } from './_actionResult.js';
import { requireActionUser } from './_actionAuth.js';
import { requirePermission } from '../middleware/withPermission.js';
import { parse } from '../lib/parseRequest.js';
import { updateSettingSchema } from '../validators/setting.validators.js';
import * as settingsService from '../services/settingsService.js';
import { recordAudit } from '../services/auditService.js';

/**
 * Mirrors app/api/v1/settings/route.js's PUT handler. The client's
 * SettingsPage.jsx edits a flat { key: value, ... } object in memory; the
 * Route Handler (and this action) only accepts { key, value } or
 * { updates: [...] } (setting.validators.js), so this translates the same
 * way the old client settingsService.updateSettings did before sending.
 */
export async function updateSettingsAction(payload) {
  return withActionResult(async () => {
    const user = await requireActionUser();
    requirePermission(user, 'settings.update');

    const updates = Object.entries(payload).map(([key, value]) => ({ key, value }));
    const body = parse('body', { updates }, updateSettingSchema);
    const agencyId = user.agencyId ?? null;

    for (const { key, value } of body.updates) {
      const row = await settingsService.setSetting(key, value, agencyId);
      // eslint-disable-next-line no-await-in-loop -- small, request-bounded batch of settings
      await recordAudit({ userId: user.id, action: 'setting.updated', entity: 'Setting', entityId: row.id, newValue: { key, value } });
    }

    return settingsService.getSettings(agencyId);
  });
}
