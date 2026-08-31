'use client';

import Link from 'next/link';
import './SectionTabs.css';

/**
 * Route-driven sub-tabs for a sidebar section that contains multiple pages
 * (e.g. Rooms -> Room Types / Rooms / Rate Plans). `tabs`: [{ to, label, end? }].
 */
export function SectionTabs({ tabs }) {
  return (
    <div className="section-tabs">
      {tabs.map((tab) => (
        <Link
          key={tab.to}
          href={tab.to}
          end={tab.end}
          className={({ isActive }) => `section-tabs__tab ${isActive ? 'section-tabs__tab--active' : ''}`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}

export default SectionTabs;
