'use client';

import Link from 'next/link';
import './Breadcrumbs.css';

/** `items`: [{ label, to? }] — the last item is rendered as plain (non-link) current-page text. */
export function Breadcrumbs({ items = [] }) {
  if (!items.length) return null;
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol>
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            // Keyed by position, not label: a trail is rebuilt wholesale from the
            // pathname, and labels are not guaranteed unique across segments.
            <li key={`${i}-${item.label}`} className={isLast ? 'breadcrumbs__item--current' : 'breadcrumbs__item'}>
              {!isLast && item.to ? <Link href={item.to}>{item.label}</Link> : <span>{item.label}</span>}
              {!isLast && <span className="breadcrumbs__sep">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default Breadcrumbs;
