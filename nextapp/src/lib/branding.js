import { cache } from 'react';
import { getPublicSettings } from '../server/services/settingsService.js';
import { DEFAULT_BRANDING } from './brandingDefaults.js';

/**
 * Server-side branding. Same shape as session.js and for the same reason: the
 * agency name and logo are resolved while rendering, so the first paint already
 * shows the right brand instead of flashing a hard-coded default.
 *
 * Calls the settings service directly -- same process, so there's no reason to
 * round-trip through GET /settings/public over HTTP the way a separate backend
 * would have required. Server-only (imports the Drizzle-backed settings
 * service): a 'use client' file must import DEFAULT_BRANDING from
 * ./brandingDefaults.js instead, never from here.
 */
export { DEFAULT_BRANDING };

/**
 * Wrapped in React's cache() so layout.jsx's generateMetadata and RootLayout
 * -- which both call this for the same request -- share one DB query instead
 * of two; cache() dedupes by request, not across requests, so branding
 * changes are still picked up on the next navigation.
 */
export const getBranding = cache(async function getBranding() {
  try {
    const settings = await getPublicSettings();
    return { ...DEFAULT_BRANDING, ...(settings ?? {}) };
  } catch {
    // A DB hiccup must not take the whole page down with it.
    return DEFAULT_BRANDING;
  }
});
