// Centralized chart color/style tokens for the recharts wrappers in this
// folder. Nothing outside components/charts/ should import recharts or pick
// chart colors directly -- see the project-wide "wrap every library" rule.
//
// The categorical order below is a validated palette (see the dataviz skill):
// adjacent pairs clear CVD ΔE >= 8 and normal-vision ΔE >= 15 in a fixed
// order, so slots must be assigned in this order and never re-cycled per
// filter state. For chart forms where every slice/point is visible at once
// (pie/donut), only the first 3 slots are guaranteed to separate from every
// other slot simultaneously -- pair those forms with direct labels too.
export const CATEGORICAL_COLORS = [
  '#2a78d6', // 1 blue
  '#eb6834', // 2 orange
  '#1baf7a', // 3 aqua
  '#eda100', // 4 yellow
  '#e87ba4', // 5 magenta
  '#008300', // 6 green
  '#4a3aa7', // 7 violet
  '#e34948', // 8 red
];

// Single-hue sequential ramp (light -> dark) for magnitude-only encodings.
export const SEQUENTIAL_BLUE = ['#cde2fb', '#9ec5f4', '#5598e7', '#2a78d6', '#1c5cab', '#0d366b'];

// Mirrors the app's CSS custom properties (styles/index.css) as plain hex,
// since recharts' SVG presentation attributes don't reliably resolve var().
export const CHART_GRID_COLOR = '#e5e7eb'; // --color-border
export const CHART_AXIS_COLOR = '#9ca3af';
export const CHART_TEXT_COLOR = '#6b7280'; // --color-text-muted
export const CHART_SURFACE = '#ffffff'; // --color-surface
