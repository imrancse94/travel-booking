'use client';

import { useBranding } from '../../contexts/BrandingContext.jsx';
import './BrandMark.css';

/** "Global Travel Agency" -> "GT". The fallback when no logo is uploaded. */
function initialsOf(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  return words.slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

/**
 * The agency's logo and name, from Settings.
 *
 * Both layouts used to hard-code their own brand text ("Travel Admin",
 * "Global Travel Agency"), so renaming the agency changed nothing outside the
 * settings page. Reading from the branding context means one upload re-brands
 * the whole app, live.
 */
export function BrandMark({ showName = true, className = '' }) {
  const { branding } = useBranding();
  const name = branding.agency_name;
  const logo = branding.agency_logo_url;

  return (
    <span className={`brand-mark ${className}`}>
      {logo ? (
        <img src={logo} alt={name} className="brand-mark__logo" />
      ) : (
        <span className="brand-mark__initials" aria-hidden="true">
          {initialsOf(name)}
        </span>
      )}
      {showName && <span className="brand-mark__name">{name}</span>}
    </span>
  );
}

export default BrandMark;
