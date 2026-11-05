// Central place to change the app's color palette, spacing, and radii.
// Keep these values in sync with the CSS custom properties in
// src/styles/index.css (:root) and the `theme.extend` block in
// tailwind.config.js -- CSS can't import from JS, so the same palette is
// intentionally declared in both places. Use this file wherever a color is
// needed as a JS value (e.g. chart series colors, inline SVG, status-badge
// color maps) rather than as a Tailwind class or CSS var().

export const COLORS = {
  primary: '#2563eb',
  primaryHover: '#1d4ed8',
  primarySoft: '#eff6ff',
  success: '#16a34a',
  warning: '#d97706',
  danger: '#dc2626',
  text: '#111827',
  textMuted: '#6b7280',
  border: '#e5e7eb',
  bg: '#f9fafb',
  surface: '#ffffff',
};

export const RADIUS = {
  sm: '6px',
  md: '10px',
  lg: '16px',
};

export const SHADOW = {
  sm: '0 1px 2px rgba(16, 24, 40, 0.05)',
  md: '0 4px 12px rgba(16, 24, 40, 0.08)',
};

export const SPACING = {
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '24px',
  6: '32px',
};

// Ordered palette for data-viz (chart series, legends) so charts stay
// consistent wherever they're rendered.
export const CHART_PALETTE = [COLORS.primary, COLORS.success, COLORS.warning, COLORS.danger, '#7c3aed', '#0891b2'];

// Maps a domain status string to a semantic tone consumed by <StatusBadge>.
// Extend this, don't hardcode colors per-page, when a new status is added.
export const STATUS_TONE = {
  // bookings
  pending: 'warning',
  held: 'warning',
  confirmed: 'success',
  checked_in: 'primary',
  checked_out: 'muted',
  cancelled: 'danger',
  completed: 'success',
  no_show: 'danger',
  // payments
  processing: 'warning',
  paid: 'success',
  failed: 'danger',
  refunded: 'muted',
  partially_refunded: 'warning',
  // rooms / entities
  available: 'success',
  occupied: 'primary',
  maintenance: 'warning',
  inactive: 'muted',
  active: 'success',
  suspended: 'danger',
};
