'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import './SectionTabs.css';

/**
 * Route-driven sub-tabs for a sidebar section that contains multiple pages
 * (e.g. Rooms -> Room Types / Rooms / Rate Plans). `tabs`: [{ to, label, end? }].
 * `end` restricts a tab to an exact path match; otherwise nested routes stay active.
 */
export function SectionTabs({ tabs }) {
  const pathname = usePathname();

  return (
    <div className="section-tabs">
      {tabs.map((tab) => {
        const isActive = tab.end
          ? pathname === tab.to
          : pathname === tab.to || pathname.startsWith(`${tab.to}/`);

        return (
          <Link
            key={tab.to}
            href={tab.to}
            className={`section-tabs__tab ${isActive ? 'section-tabs__tab--active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

export default SectionTabs;
