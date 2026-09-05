/**
 * The handful of inline icons the admin UI needs. No icon package: these are
 * two 16px glyphs, and a dependency for that is not worth the bytes.
 *
 * Every icon strokes in `currentColor`, so it takes the colour of the button
 * or text it sits in -- white on a primary/danger button, the text colour in a
 * ghost one -- and stays correct in both light and dark themes.
 */

const BASE = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  // Decorative: the button's own text is what a screen reader announces.
  'aria-hidden': 'true',
  focusable: 'false',
};

export function EditIcon(props) {
  return (
    <svg {...BASE} {...props}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" />
    </svg>
  );
}

export function TrashIcon(props) {
  return (
    <svg {...BASE} {...props}>
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

export function ArrowLeftIcon(props) {
  return (
    <svg {...BASE} {...props}>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
}

export function ChevronDownIcon(props) {
  return (
    <svg {...BASE} {...props}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function PlusCircleIcon(props) {
  return (
    <svg {...BASE} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </svg>
  );
}
