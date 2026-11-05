import { apiHandler } from '../../../../../server/lib/apiHandler.js';
import { success } from '../../../../../server/lib/apiResponse.js';
import * as settingsService from '../../../../../server/services/settingsService.js';

export const GET = apiHandler(async () => {
  const settings = await settingsService.getPublicSettings();
  return success({ data: settings });
});
