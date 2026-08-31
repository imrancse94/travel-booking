'use client';

import { Input } from './Input.jsx';
import './SearchFilterBar.css';

/**
 * Standard list-page filter row: a search box, an optional native
 * `<input type="date">` pair for a date range, and a `children` slot for any
 * resource-specific filter controls (status Select, etc).
 */
export function SearchFilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search...',
  dateRange,
  onDateRangeChange,
  children,
}) {
  return (
    <div className="search-filter-bar">
      {onSearchChange && (
        <div className="search-filter-bar__search">
          <Input
            type="search"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Search"
            containerClassName="search-filter-bar__field"
          />
        </div>
      )}

      {onDateRangeChange && (
        <div className="search-filter-bar__date-range">
          <input
            type="date"
            className="form-field__control"
            value={dateRange?.from || ''}
            onChange={(e) => onDateRangeChange({ ...dateRange, from: e.target.value })}
            aria-label="From date"
          />
          <span className="search-filter-bar__date-sep">to</span>
          <input
            type="date"
            className="form-field__control"
            value={dateRange?.to || ''}
            onChange={(e) => onDateRangeChange({ ...dateRange, to: e.target.value })}
            aria-label="To date"
          />
        </div>
      )}

      {children && <div className="search-filter-bar__extra">{children}</div>}
    </div>
  );
}

export default SearchFilterBar;
