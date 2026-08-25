import './StatusBadge.css';

// Bookings, payments, rooms, invoices, commissions, etc. each have their own
// status vocabulary. This default map covers every status string used across
// the system; pass a custom `toneMap` (or an explicit `tone`) to override.
const DEFAULT_TONE_MAP = {
  // bookings
  pending: 'warning',
  held: 'warning',
  confirmed: 'success',
  checked_in: 'info',
  checked_out: 'neutral',
  cancelled: 'danger',
  completed: 'success',
  no_show: 'danger',
  // payments / refunds
  processing: 'info',
  paid: 'success',
  failed: 'danger',
  refunded: 'neutral',
  partially_refunded: 'warning',
  rejected: 'danger',
  approved: 'info',
  // rooms / vehicles / entities
  available: 'success',
  occupied: 'info',
  maintenance: 'warning',
  inactive: 'neutral',
  active: 'success',
  suspended: 'danger',
  in_use: 'info',
  in_progress: 'info',
  // invoices
  unpaid: 'warning',
  partially_paid: 'info',
  void: 'neutral',
};

function toLabel(status) {
  return String(status || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Color-coded pill for a status string. Pass `tone` to force a color, or `toneMap` to override the default status->tone lookup. */
export function StatusBadge({ status, tone, label, toneMap }) {
  const resolvedTone = tone || (toneMap || DEFAULT_TONE_MAP)[status] || 'neutral';
  return <span className={`status-badge status-badge--${resolvedTone}`}>{label || toLabel(status)}</span>;
}

export default StatusBadge;
export { DEFAULT_TONE_MAP as statusToneMap };
