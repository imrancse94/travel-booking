/**
 * Split out of lib/branding.js so client components (BrandingContext.jsx)
 * can import just this constant without pulling in getBranding() and,
 * through it, the server-only Drizzle/pg stack -- a 'use client' file that
 * imported from lib/branding.js used to work by accident when getBranding()
 * called fetch(), but broke the production build once it called the
 * settings service directly (Next then tries to bundle `pg` for the browser).
 */
export const DEFAULT_BRANDING = {
  agency_name: 'Global Travel Agency',
  agency_logo_url: null,
  agency_favicon_url: null,
  currency: 'USD',
  timezone: 'UTC',
};
