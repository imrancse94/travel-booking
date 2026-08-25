import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Button,
  Card,
  ConfirmDialog,
  Loader,
  StatusBadge,
  Table,
  Textarea,
  useToast,
} from '../../components/ui/index.js';
import * as bookingService from '../../services/bookingService.js';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/format.js';

const GUEST_COLUMNS = [
  { key: 'name', header: 'Name', render: (g) => `${g.firstName} ${g.lastName}${g.isPrimary ? ' (Primary)' : ''}` },
  { key: 'email', header: 'Email', render: (g) => g.email || '—' },
  { key: 'phone', header: 'Phone', render: (g) => g.phone || '—' },
];

const ROOM_COLUMNS = [
  { key: 'roomType', header: 'Room Type', render: (r) => r.roomType?.name || r.room?.roomType?.name || '—' },
  { key: 'checkIn', header: 'Check-in', render: (r) => formatDate(r.checkIn) },
  { key: 'checkOut', header: 'Check-out', render: (r) => formatDate(r.checkOut) },
  { key: 'nights', header: 'Nights' },
  { key: 'totalPrice', header: 'Total', render: (r) => formatCurrency(r.totalPrice, r.currency) },
];

const SERVICE_COLUMNS = [
  { key: 'name', header: 'Service', render: (s) => s.service?.name || '—' },
  { key: 'quantity', header: 'Qty' },
  { key: 'total', header: 'Total', render: (s) => formatCurrency(s.total) },
];

const PAYMENT_COLUMNS = [
  { key: 'method', header: 'Method', render: (p) => <StatusBadge status={p.method} tone="neutral" /> },
  { key: 'amount', header: 'Amount', render: (p) => formatCurrency(p.amount, p.currency) },
  { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
  { key: 'paidAt', header: 'Paid At', render: (p) => formatDateTime(p.paidAt) },
];

const CANCELLABLE_STATUSES = ['pending', 'held', 'confirmed'];

/** Customer-facing booking detail: rooms, guests, services, payments, and a self-service cancel action. */
export function BookingDetail() {
  const { id } = useParams();
  const { show } = useToast();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    return bookingService
      .getById(id)
      .then((res) => setBooking(res.data))
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCancel() {
    setCancelling(true);
    try {
      await bookingService.cancel(id, { reason: cancelReason });
      show('Booking cancelled', 'success');
      setConfirmOpen(false);
      setCancelReason('');
      await load();
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setCancelling(false);
    }
  }

  if (loading) return <Loader label="Loading booking..." />;
  if (error || !booking) {
    return (
      <div className="container page-section">
        <div className="error-state">
          <p>Could not load this booking{error ? `: ${error.message}` : '.'}</p>
        </div>
      </div>
    );
  }

  const canCancel = CANCELLABLE_STATUSES.includes(booking.status);

  return (
    <div className="container page-section">
      <div className="page-header">
        <div>
          <h1 className="page-title">{booking.bookingNumber}</h1>
          <p className="page-subtitle">
            {booking.hotel?.name} &middot; {formatDate(booking.checkIn)} to {formatDate(booking.checkOut)}
          </p>
        </div>
        <div className="page-actions">
          <StatusBadge status={booking.status} />
          {canCancel && (
            <Button variant="danger" onClick={() => setConfirmOpen(true)}>
              Cancel Booking
            </Button>
          )}
        </div>
      </div>

      <Card title="Booking Summary">
        <div className="detail-list">
          <div>
            <p className="detail-item__label">Adults / Children</p>
            <p className="detail-item__value">
              {booking.adults} / {booking.children}
            </p>
          </div>
          <div>
            <p className="detail-item__label">Total</p>
            <p className="detail-item__value">{formatCurrency(booking.totalAmount, booking.currency)}</p>
          </div>
          <div>
            <p className="detail-item__label">Paid</p>
            <p className="detail-item__value">{formatCurrency(booking.paidAmount, booking.currency)}</p>
          </div>
          <div>
            <p className="detail-item__label">Due</p>
            <p className="detail-item__value">{formatCurrency(booking.dueAmount, booking.currency)}</p>
          </div>
        </div>
        {booking.specialRequests && (
          <p style={{ marginTop: 'var(--space-4)' }}>
            <span className="detail-item__label">Special Requests</span>
            <br />
            {booking.specialRequests}
          </p>
        )}
        {booking.cancellationReason && (
          <p style={{ marginTop: 'var(--space-4)' }}>
            <span className="detail-item__label">Cancellation Reason</span>
            <br />
            {booking.cancellationReason}
          </p>
        )}
      </Card>

      <Card title="Guests" style={{ marginTop: 'var(--space-5)' }}>
        <Table columns={GUEST_COLUMNS} rows={booking.guests || []} emptyMessage="No guests recorded." />
      </Card>

      <Card title="Rooms" style={{ marginTop: 'var(--space-5)' }}>
        <Table columns={ROOM_COLUMNS} rows={booking.bookingRooms || []} emptyMessage="No rooms recorded." />
      </Card>

      {booking.services?.length > 0 && (
        <Card title="Extra Services" style={{ marginTop: 'var(--space-5)' }}>
          <Table columns={SERVICE_COLUMNS} rows={booking.services} emptyMessage="No extra services." />
        </Card>
      )}

      <Card title="Payments" style={{ marginTop: 'var(--space-5)' }}>
        <Table columns={PAYMENT_COLUMNS} rows={booking.payments || []} emptyMessage="No payments recorded." />
      </Card>

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Cancel booking"
        loading={cancelling}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleCancel}
        confirmLabel="Cancel Booking"
        message={
          <Textarea
            label="Reason for cancelling (optional)"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
        }
      />
    </div>
  );
}

export default BookingDetail;
