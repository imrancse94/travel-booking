'use client';

import { useBranding } from '../../contexts/BrandingContext.jsx';
import { APP_NAME, APP_NAME_PARTS, APP_TAGLINE, DEFAULT_LOGO_ICON } from '../../lib/appConfig.js';
import './BrandMark.css';

/**
 * The agency's logo and name.
 *
 * - A logo uploaded in Settings wins: image + the configured name.
 * - Otherwise: the app icon plus the Stayvixo wordmark, drawn as live text so
 *   it is crisp at any size and can adapt to its background. If Settings
 *   renames the agency, the new name is shown as plain text instead.
 *
 * `tone="light"` is for dark backgrounds (white "Stay"). The "HOTEL
 * RESERVATION" tagline always sits under the name.
 */
export function BrandMark({ showName = true, tone = 'dark', className = '' }) {
  const { branding } = useBranding();
  const name = branding.agency_name;
  const logo = branding.agency_logo_url;

  if (!logo && name === APP_NAME) {
    return (
      <span className={`brand-mark brand-mark--wordmark brand-mark--${tone} ${className}`} role="img" aria-label={name}>
        <img src={DEFAULT_LOGO_ICON} alt="" aria-hidden="true" className="brand-mark__icon" />
        <span className="brand-mark__text" aria-hidden="true">
          <span className="brand-mark__word">
            {APP_NAME_PARTS[0]}
            <span className="brand-mark__word-accent">{APP_NAME_PARTS[1]}</span>
            <svg className="brand-mark__swoosh" viewBox="0 0 100 8" preserveAspectRatio="none">
              <path d="M2 6C30 0.5 70 0.5 98 5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </span>
          <span className="brand-mark__tagline">{APP_TAGLINE}</span>
        </span>
      </span>
    );
  }

  return (
    <span className={`brand-mark ${className}`}>
      {logo && <img src={logo} alt={name} className="brand-mark__logo" />}
      {showName && <span className="brand-mark__name">{name}</span>}
    </span>
  );
}

export default BrandMark;
