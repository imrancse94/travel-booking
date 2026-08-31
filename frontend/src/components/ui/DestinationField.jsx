'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useDestinationSuggestions } from '../../hooks/useDestinationSuggestions.js';
import './DestinationField.css';

/** Splits `text` on the first case-insensitive occurrence of `query`. */
function highlight(text, query) {
  const q = query.trim();
  if (!q) return text;
  const at = text.toLowerCase().indexOf(q.toLowerCase());
  if (at === -1) return text;
  return (
    <>
      {text.slice(0, at)}
      <mark className="dest-field__match">{text.slice(at, at + q.length)}</mark>
      {text.slice(at + q.length)}
    </>
  );
}

/**
 * Destination input with live suggestions.
 *
 * Free text is always allowed — the API matches on city or hotel name, so a
 * suggestion is a shortcut, never a requirement. Suggestions come from
 * useDestinationSuggestions, which serves them from a once-per-session cache
 * rather than calling the API on each keystroke.
 */
export function DestinationField({
  value,
  onChange,
  label = 'Destination',
  placeholder = 'City or hotel name',
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef(null);
  const baseId = useId();
  const inputId = `${baseId}-input`;
  const listId = `${baseId}-listbox`;

  const { suggestions, loading } = useDestinationSuggestions(value);
  const isOpen = open && suggestions.length > 0;

  useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  // A stale highlight after the list changes would select the wrong row.
  useEffect(() => {
    setActiveIndex(-1);
  }, [suggestions]);

  function commit(destination) {
    onChange(destination.name);
    setOpen(false);
    setActiveIndex(-1);
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown' && !isOpen) {
      setOpen(true);
      return;
    }
    if (!isOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      // Only swallow Enter when a suggestion is highlighted, so pressing it
      // with free text still submits the search form.
      e.preventDefault();
      commit(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div ref={rootRef} className={`form-field dest-field ${className}`}>
      <label className="form-field__label" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        className="form-field__control"
        type="text"
        role="combobox"
        autoComplete="off"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeIndex >= 0 ? `${listId}-opt-${activeIndex}` : undefined}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />

      {isOpen && (
        <ul className="dest-field__list" id={listId} role="listbox" aria-label="Destination suggestions">
          {suggestions.map((d, i) => (
            <li key={d.id ?? d.name} id={`${listId}-opt-${i}`} role="option" aria-selected={i === activeIndex}>
              <button
                type="button"
                className={`dest-field__option ${i === activeIndex ? 'dest-field__option--active' : ''}`}
                // mousedown fires before the input's blur, so the click is not
                // lost to the dropdown closing first.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => commit(d)}
                onMouseEnter={() => setActiveIndex(i)}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="2.5" />
                </svg>
                <span>
                  <span className="dest-field__name">{highlight(d.name, value)}</span>
                  {d.country && <span className="dest-field__country">, {d.country}</span>}
                </span>
              </button>
            </li>
          ))}
          {loading && <li className="dest-field__status">Searching…</li>}
        </ul>
      )}
    </div>
  );
}

export default DestinationField;
