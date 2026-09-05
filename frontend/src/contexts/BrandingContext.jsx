'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_BRANDING } from '../lib/branding.js';
import { setDisplayTimezone } from '../utils/format.js';

const BrandingContext = createContext({ branding: DEFAULT_BRANDING, applyBranding: () => {} });

/**
 * Agency branding (name, logo) for the whole tree.
 *
 * Seeded from the server so it is correct on first paint, and updatable from
 * the client so saving Settings re-brands the running app immediately --
 * without that, a new logo only appeared after a full reload.
 *
 * Also the one place that pushes `timezone` into utils/format.js's shared
 * date formatters (see setDisplayTimezone) -- set directly during render, not
 * only in an effect, so the very first paint already converts to the
 * configured zone instead of flashing UTC before an effect can run.
 */
export function BrandingProvider({ branding: initial, children }) {
  const [branding, setBranding] = useState({ ...DEFAULT_BRANDING, ...(initial ?? {}) });
  setDisplayTimezone(branding.timezone);

  useEffect(() => {
    setDisplayTimezone(branding.timezone);
  }, [branding.timezone]);

  const value = useMemo(
    () => ({
      branding,
      applyBranding: (next) => setBranding((current) => ({ ...current, ...next })),
    }),
    [branding]
  );

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  return useContext(BrandingContext);
}

export default BrandingContext;
