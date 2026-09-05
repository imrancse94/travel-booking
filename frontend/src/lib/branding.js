/**
 * Server-side branding. Same shape as session.js and for the same reason: the
 * agency name and logo are resolved while rendering, so the first paint already
 * shows the right brand instead of flashing a hard-coded default.
 *
 * GET /settings requires a session and the settings.view permission, so this
 * uses the public slice -- the sign-in page has neither.
 */
const API_BASE = process.env.API_INTERNAL_URL || 'http://localhost:4000/api/v1';

export const DEFAULT_BRANDING = {
  agency_name: 'Global Travel Agency',
  agency_logo_url: null,
  agency_favicon_url: null,
  currency: 'USD',
  timezone: 'UTC',
};

export async function getBranding() {
  try {
    const res = await fetch(`${API_BASE}/settings/public`, {
      // Settings change rarely but must not go stale for long; 60s keeps this
      // off the hot path without making a save feel unapplied.
      next: { revalidate: 60 },
    });
    if (!res.ok) return DEFAULT_BRANDING;
    const body = await res.json();
    return { ...DEFAULT_BRANDING, ...(body?.data ?? {}) };
  } catch {
    // A backend that is down must not take the whole page down with it.
    return DEFAULT_BRANDING;
  }
}
