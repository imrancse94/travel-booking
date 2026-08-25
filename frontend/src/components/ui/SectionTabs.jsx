import { NavLink } from 'react-router-dom';
import './SectionTabs.css';

/**
 * Route-driven sub-tabs for a sidebar section that contains multiple pages
 * (e.g. Rooms -> Room Types / Rooms / Rate Plans). `tabs`: [{ to, label, end? }].
 */
export function SectionTabs({ tabs }) {
  return (
    <div className="section-tabs">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) => `section-tabs__tab ${isActive ? 'section-tabs__tab--active' : ''}`}
        >
          {tab.label}
        </NavLink>
      ))}
    </div>
  );
}

export default SectionTabs;
