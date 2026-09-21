'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './DateRangePicker.css';

function IconCalendar() {
  return (
    <svg
      className="drp__trigger-icon"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/*
 * Dates are handled as plain `YYYY-MM-DD` strings, which is what the API and
 * the query string use. Every string is parsed to LOCAL noon: parsing
 * '2026-09-10' with `new Date(...)` gives UTC midnight, which is the previous
 * day for anyone west of UTC, and noon leaves room for DST shifts in either
 * direction without the calendar day changing.
 */
function parseISO(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12);
}

function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(date, n) {
  const next = new Date(date);
  next.setDate(next.getDate() + n);
  return next;
}

function addMonths(date, n) {
  const next = new Date(date.getFullYear(), date.getMonth() + n, 1, 12);
  return next;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 12);
}

function todayISO() {
  return toISO(new Date());
}

/** Calendar cells for one month, padded to whole weeks with nulls. */
function monthGrid(monthStart) {
  const firstWeekday = monthStart.getDay();
  const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: firstWeekday }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(monthStart.getFullYear(), monthStart.getMonth(), day, 12));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function formatTrigger(iso) {
  const date = parseISO(iso);
  if (!date) return null;
  // Formatted from fixed tables rather than toLocaleDateString: that resolves
  // against the runtime's ICU data, so a server render and the browser can
  // produce different strings for the same date and React reports a hydration
  // mismatch on any server-rendered route.
  return `${WEEKDAYS[date.getDay()]}, ${MONTHS[date.getMonth()].slice(0, 3)} ${date.getDate()}`;
}

function nightsBetween(startISO, endISO) {
  const a = parseISO(startISO);
  const b = parseISO(endISO);
  if (!a || !b) return 0;
  return Math.max(0, Math.round((b - a) / 86400000));
}

/**
 * Two triggers (check-in / check-out) sharing one range calendar, replacing a
 * pair of `<input type="date">` boxes whose look and behaviour are entirely
 * browser-dependent.
 *
 * `startDate`/`endDate` are `YYYY-MM-DD` strings and `onChange` reports both at
 * once, so a range is never briefly inverted while the user is mid-selection.
 */
export function DateRangePicker({
  startDate,
  endDate,
  onChange,
  minDate = todayISO(),
  startLabel = 'Check-in',
  endLabel = 'Check-out',
  // 'start' anchors the popover to the left edge; use 'end' when the control
  // sits near the right of the viewport (a sidebar), where a two-month
  // popover opening rightwards would run off screen.
  align = 'start',
  className = '',
}) {
  // null when closed, otherwise which end of the range the next click sets.
  const [step, setStep] = useState(null);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(parseISO(startDate) || new Date()));
  const [hovered, setHovered] = useState(null);
  const [focusedDay, setFocusedDay] = useState(startDate || minDate);

  const rootRef = useRef(null);
  const anchorRef = useRef(null);
  const popoverRef = useRef(null);
  const startTriggerRef = useRef(null);
  const endTriggerRef = useRef(null);
  const dayRefs = useRef(new Map());

  // The popover renders into document.body rather than inline. Inline, it
  // inherits every ancestor's overflow and stacking context -- the landing hero
  // clips it (overflow: hidden) and traps it (isolation: isolate) -- and a
  // popover must never be able to reflow the page it opens over.
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState(null);
  useEffect(() => setMounted(true), []);

  const isOpen = step !== null;
  const nights = nightsBetween(startDate, endDate);

  // Fixed coordinates derived from the anchor, flipped above when there is not
  // enough room below and clamped so it can never hang off screen.
  const reposition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const popover = popoverRef.current;
    const width = popover?.offsetWidth ?? 0;
    const height = popover?.offsetHeight ?? 0;
    const margin = 8;

    const spaceBelow = window.innerHeight - rect.bottom;
    const flipUp = height > 0 && spaceBelow < height + margin && rect.top > spaceBelow;
    const top = flipUp ? Math.max(margin, rect.top - height - margin) : rect.bottom + margin;

    let left = align === 'end' ? rect.right - width : rect.left;
    const maxLeft = window.innerWidth - width - margin;
    left = Math.min(Math.max(margin, left), Math.max(margin, maxLeft));

    setPosition({ top, left, minWidth: rect.width });
  }, [align]);

  useLayoutEffect(() => {
    if (!isOpen) {
      setPosition(null);
      return undefined;
    }
    reposition();
    // A second pass once the popover has real dimensions, so the flip-up and
    // clamp decisions are made against its measured size rather than zero.
    const raf = requestAnimationFrame(reposition);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [isOpen, reposition, viewMonth]);

  const close = useCallback(
    (restoreFocusTo) => {
      setStep(null);
      setHovered(null);
      if (restoreFocusTo === 'start') startTriggerRef.current?.focus();
      if (restoreFocusTo === 'end') endTriggerRef.current?.focus();
    },
    []
  );

  function open(which) {
    setStep(which);
    setHovered(null);
    const anchor = which === 'end' ? endDate || startDate : startDate;
    setViewMonth(startOfMonth(parseISO(anchor) || new Date()));
    setFocusedDay(anchor || minDate);
  }

  // Dismiss on outside click and on Escape, the two things a popover is
  // expected to do and the reason this cannot be a plain inline calendar.
  useEffect(() => {
    if (!isOpen) return undefined;
    function onPointerDown(e) {
      // The popover is portalled out of the root, so both subtrees count as
      // "inside" for dismissal purposes.
      const insideRoot = rootRef.current?.contains(e.target);
      const insidePopover = popoverRef.current?.contains(e.target);
      if (!insideRoot && !insidePopover) close();
    }
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close(step);
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, step, close]);

  // Roving focus: the grid holds one tabbable day, and arrow keys move it.
  useEffect(() => {
    if (!isOpen) return;
    dayRefs.current.get(focusedDay)?.focus();
  }, [isOpen, focusedDay, viewMonth]);

  const months = useMemo(() => [viewMonth, addMonths(viewMonth, 1)], [viewMonth]);

  function selectDay(iso) {
    if (step === 'start') {
      // A new check-in after the current check-out would invert the range, so
      // the check-out is dropped and the user picks it next.
      const keepEnd = endDate && endDate > iso ? endDate : '';
      onChange({ startDate: iso, endDate: keepEnd });
      setStep('end');
      setFocusedDay(keepEnd || iso);
      return;
    }
    if (!startDate || iso <= startDate) {
      // Clicking on or before the check-in restarts the range there.
      onChange({ startDate: iso, endDate: '' });
      setStep('end');
      setFocusedDay(iso);
      return;
    }
    onChange({ startDate, endDate: iso });
    close('end');
  }

  function moveFocus(days) {
    const current = parseISO(focusedDay) || new Date();
    const next = addDays(current, days);
    const nextISO = toISO(next);
    if (minDate && nextISO < minDate) return;
    setFocusedDay(nextISO);
    if (next < viewMonth || next >= addMonths(viewMonth, 2)) {
      setViewMonth(startOfMonth(next));
    }
  }

  function onGridKeyDown(e) {
    const keys = {
      ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7,
      PageUp: null, PageDown: null, Home: null, End: null,
    };
    if (!(e.key in keys)) return;
    e.preventDefault();
    if (e.key === 'PageUp') { setViewMonth(addMonths(viewMonth, -1)); return; }
    if (e.key === 'PageDown') { setViewMonth(addMonths(viewMonth, 1)); return; }
    if (e.key === 'Home') { moveFocus(-(parseISO(focusedDay)?.getDay() ?? 0)); return; }
    if (e.key === 'End') { moveFocus(6 - (parseISO(focusedDay)?.getDay() ?? 0)); return; }
    moveFocus(keys[e.key]);
  }

  // While picking the check-out, the hovered day previews the range so the
  // number of nights is visible before committing.
  const previewEnd = step === 'end' && !endDate ? hovered : endDate;

  function dayState(iso) {
    const isStart = iso === startDate;
    const isEnd = iso === previewEnd;
    const inRange = startDate && previewEnd && iso > startDate && iso < previewEnd;
    return { isStart, isEnd, inRange };
  }

  return (
    <div ref={rootRef} className={`drp ${className}`}>
      <div ref={anchorRef} className="drp__triggers">
        {[
          { key: 'start', label: startLabel, value: startDate, ref: startTriggerRef },
          { key: 'end', label: endLabel, value: endDate, ref: endTriggerRef },
        ].map((field) => (
          <div key={field.key} className="form-field">
            <span className="form-field__label" id={`drp-label-${field.key}`}>
              {field.label}
            </span>
            <button
              ref={field.ref}
              type="button"
              className={`drp__trigger ${step === field.key ? 'drp__trigger--active' : ''}`}
              aria-haspopup="dialog"
              aria-expanded={step === field.key}
              aria-labelledby={`drp-label-${field.key}`}
              onClick={() => (step === field.key ? close(field.key) : open(field.key))}
            >
              <IconCalendar />
              <span className={field.value ? '' : 'drp__placeholder'}>
                {formatTrigger(field.value) || 'Select date'}
              </span>
            </button>
          </div>
        ))}
      </div>

      {isOpen && mounted &&
        createPortal(
          <div
            ref={popoverRef}
            className="drp__popover"
            role="dialog"
            aria-modal="false"
            aria-label="Select your stay dates"
            style={
              position
                ? { top: position.top, left: position.left, minWidth: position.minWidth }
                : { opacity: 0, pointerEvents: 'none' }
            }
          >
          <div className="drp__nav">
            <button
              type="button"
              className="drp__nav-btn"
              onClick={() => setViewMonth(addMonths(viewMonth, -1))}
              aria-label="Previous month"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <p className="drp__nav-title" aria-live="polite">
              {MONTHS[months[0].getMonth()]} {months[0].getFullYear()} &ndash; {MONTHS[months[1].getMonth()]} {months[1].getFullYear()}
            </p>
            <button
              type="button"
              className="drp__nav-btn"
              onClick={() => setViewMonth(addMonths(viewMonth, 1))}
              aria-label="Next month"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>

          <div className="drp__months" onKeyDown={onGridKeyDown} onMouseLeave={() => setHovered(null)}>
            {months.map((month) => (
              <div key={`${month.getFullYear()}-${month.getMonth()}`} className="drp__month">
                <p className="drp__month-name">
                  {MONTHS[month.getMonth()]} {month.getFullYear()}
                </p>
                <div className="drp__weekdays" aria-hidden="true">
                  {WEEKDAYS.map((w) => (
                    <span key={w}>{w}</span>
                  ))}
                </div>
                <div className="drp__grid" role="grid">
                  {monthGrid(month).map((week, wi) => (
                    <div key={wi} className="drp__week" role="row">
                      {week.map((date, di) => {
                        if (!date) return <span key={di} className="drp__day drp__day--empty" role="gridcell" />;
                        const iso = toISO(date);
                        const disabled = Boolean(minDate) && iso < minDate;
                        const { isStart, isEnd, inRange } = dayState(iso);
                        return (
                          <span key={di} role="gridcell" className="drp__cell">
                            <button
                              ref={(el) => {
                                if (el) dayRefs.current.set(iso, el);
                                else dayRefs.current.delete(iso);
                              }}
                              type="button"
                              className={[
                                'drp__day',
                                isStart ? 'drp__day--start' : '',
                                isEnd ? 'drp__day--end' : '',
                                inRange ? 'drp__day--in-range' : '',
                                iso === todayISO() ? 'drp__day--today' : '',
                              ].filter(Boolean).join(' ')}
                              tabIndex={iso === focusedDay ? 0 : -1}
                              disabled={disabled}
                              aria-selected={isStart || isEnd}
                              aria-label={`${WEEKDAYS_LONG[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`}
                              onClick={() => selectDay(iso)}
                              onMouseEnter={() => setHovered(iso)}
                              onFocus={() => setFocusedDay(iso)}
                            >
                              {date.getDate()}
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="drp__footer">
            <p className="drp__summary">
              {startDate && endDate
                ? `${nights} night${nights === 1 ? '' : 's'} selected`
                : step === 'end'
                  ? 'Choose a check-out date'
                  : 'Choose a check-in date'}
            </p>
            <button type="button" className="drp__done" onClick={() => close(step)}>
              Done
            </button>
          </div>
          </div>,
          document.body
        )}
    </div>
  );
}

export default DateRangePicker;
