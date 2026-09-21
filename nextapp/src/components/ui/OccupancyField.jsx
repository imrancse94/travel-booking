'use client';

import { useEffect, useId, useRef, useState } from 'react';
import './OccupancyField.css';

const ROWS = [
  { key: 'adults', label: 'Adults', hint: 'Age 13+', min: 1, max: 12 },
  { key: 'children', label: 'Children', hint: 'Age 0–12', min: 0, max: 8 },
  { key: 'rooms', label: 'Rooms', min: 1, max: 6 },
];

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/**
 * Adults, children and rooms behind one trigger.
 *
 * As three separate number inputs these took half the filter bar and invited
 * typed nonsense; steppers with explicit bounds cannot produce an invalid
 * occupancy at all. Values stay strings because they go straight into the
 * query string.
 */
export function OccupancyField({ value, onChange, label = 'Guests & rooms', className = '' }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const baseId = useId();

  const adults = Number(value.adults) || 1;
  const children = Number(value.children) || 0;
  const rooms = Number(value.rooms) || 1;

  const summary = [
    plural(adults, 'adult'),
    children > 0 ? plural(children, 'child').replace('childs', 'children') : null,
    plural(rooms, 'room'),
  ]
    .filter(Boolean)
    .join(' · ');

  useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const current = { adults, children, rooms };

  function step(key, delta, min, max) {
    const next = Math.min(max, Math.max(min, current[key] + delta));
    // All three come back as strings: they go straight into the query string,
    // and a mixed number/string shape made every caller re-cast them.
    onChange({
      adults: String(current.adults),
      children: String(current.children),
      rooms: String(current.rooms),
      [key]: String(next),
    });
  }

  return (
    <div ref={rootRef} className={`form-field occupancy ${className}`}>
      <span className="form-field__label" id={`${baseId}-label`}>
        {label}
      </span>
      <button
        ref={triggerRef}
        type="button"
        className={`occupancy__trigger ${open ? 'occupancy__trigger--active' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-labelledby={`${baseId}-label`}
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="3.2" />
          <path d="M22 20v-2a4 4 0 0 0-3-3.87M16.5 4.2a4 4 0 0 1 0 7.6" />
        </svg>
        <span className="occupancy__summary">{summary}</span>
      </button>

      {open && (
        <div className="occupancy__popover" role="dialog" aria-label="Guests and rooms">
          {ROWS.map((row) => {
            const n = current[row.key];
            return (
              <div key={row.key} className="occupancy__row">
                <div>
                  <p className="occupancy__row-label">{row.label}</p>
                  {row.hint && <p className="occupancy__row-hint">{row.hint}</p>}
                </div>
                <div className="occupancy__stepper">
                  <button
                    type="button"
                    className="occupancy__step"
                    onClick={() => step(row.key, -1, row.min, row.max)}
                    disabled={n <= row.min}
                    aria-label={`Fewer ${row.label.toLowerCase()}`}
                  >
                    −
                  </button>
                  <span className="occupancy__count" aria-live="polite">
                    {n}
                  </span>
                  <button
                    type="button"
                    className="occupancy__step"
                    onClick={() => step(row.key, 1, row.min, row.max)}
                    disabled={n >= row.max}
                    aria-label={`More ${row.label.toLowerCase()}`}
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
          <div className="occupancy__footer">
            <button type="button" className="occupancy__done" onClick={() => setOpen(false)}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default OccupancyField;
