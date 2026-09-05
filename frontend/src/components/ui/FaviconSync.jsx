'use client';

import { useEffect } from 'react';
import { useBranding } from '../../contexts/BrandingContext.jsx';

/**
 * Keeps the browser tab icon in sync with the branding context.
 *
 * The server already renders the right favicon into the initial <head> (see
 * generateMetadata in app/layout.jsx), but that HTML is only produced once per
 * navigation. Saving Settings updates the context immediately, and without
 * this the new favicon would not show until the next full page load. Runs
 * once per branding change, not once per render.
 *
 * No cache-busting query string is needed: every upload gets a fresh,
 * unique filename (timestamp + random suffix -- see uploadService.js on the
 * backend), so a changed favicon is always a new URL the browser has never
 * cached, never a stale hit on the old one.
 */
export function FaviconSync() {
  const { branding } = useBranding();

  useEffect(() => {
    const href = branding.agency_favicon_url || '/favicon.svg';
    let link = document.querySelector("link[rel='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    if (link.href !== href) {
      link.href = href;
    }
  }, [branding.agency_favicon_url]);

  return null;
}

export default FaviconSync;
