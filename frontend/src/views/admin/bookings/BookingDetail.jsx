'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  Button,
  Card,
  ConfirmDialog,
  Loader,
  Modal,
  StatusBadge,
  Table,
  Textarea,
  useToast,
} from '../../../components/ui/index.js';
import { usePermission } from '../../../hooks/usePermission.js';
import * as bookingService from '../../../services/bookingService.js';
import { formatCurrency, formatDate, formatDateTime } from '../../../utils/format.js';

const GUEST_COLUMNS = [
  { key: 'name', header: 'Name', render: (g) => `${g.firstName} ${g.lastName}${g.isPrimary ? ' (Primary)' : ''}` },
  { key: 'email', header: 'Email', render: (g) => g.email || '—' },
  { key: 'phone', header: 'Phone', render: (g) => g.phone || '—' },
  { key: 'nationality', header: 'Nationality', render: (g) => g.nationality || '—' },
  { key: 'passportNumber', header: 'Passport #', render: (g) => g.passportNumber || '—' },
];

const ROOM_COLUMNS = [
  { key: 'room', header: 'Room', render: (r) => `${r.room?.roomNumber || '—'} (${r.roomType?.name || ''})` },
  { key: 'checkIn', header: 'Check-in', render: (r) => formatDate(r.checkIn) },
  { key: 'checkOut', header: 'Check-out', render: (r) => formatDate(r.checkOut) },
  { key: 'nights', header: 'Nights' },
  { key: 'ratePerNight', header: 'Rate/Night', render: (r) => formatCurrency(r.ratePerNight) },
  { key: 'totalPrice', header: 'Total', render: (r) => formatCurrency(r.totalPrice) },
];

const SERVICE_COLUMNS = [
  { key: 'name', header: 'Service', render: (s) => s.service?.name || '—' },
  { key: 'quantity', header: 'Qty' },
  { key: 'price', header: 'Unit Price', render: (s) => formatCurrency(s.price) },
  { key: 'tax', header: 'Tax', render: (s) => formatCurrency(s.tax) },
  { key: 'total', header: 'Total', render: (s) => formatCurrency(s.total) },
];

const PAYMENT_COLUMNS = [
  { key: 'method', header: 'Method', render: (p) => <StatusBadge status={p.method} tone="neutral" /> },
  { key: 'amount', header: 'Amount', render: (p) => formatCurrency(p.amount, p.currency) },
  { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
  { key: 'paidAt', header: 'Paid At', render: (p) => formatDateTime(p.paidAt) },
];

/** Booking detail: guests, rooms, services, payments, status history, and permission-gated lifecycle actions. */
export function BookingDetail() {
  const { id } = useParams();
  const router = useRouter();
  const { show } = useToast();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyAction, setBusyAction] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [checkModal, setCheckModal] = useState(null); // 'check-in' | 'check-out' | null
  const [notes, setNotes] = useState('');

  const canCancel = usePermission('bookings.cancel');
  const canConfirm = usePermission('bookings.confirm');
  const canCheckIn = usePermission('bookings.checkin');
  const canCheckOut = usePermission('bookings.checkout');

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

  async function handleConfirmAction() {
    setBusyAction('confirm');
    try {
      await bookingService.confirm(id);
      show('Booking confirmed', 'success');
      await load();
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCancelAction() {
    setBusyAction('cancel');
    try {
      await bookingService.cancel(id, { reason: cancelReason });
      show('Booking cancelled', 'success');
      setConfirmOpen(false);
      setCancelReason('');
      await load();
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCheckAction() {
    setBusyAction(checkModal);
    try {
      if (checkModal === 'check-in') {
        await bookingService.checkIn(id, { notes });
        show('Guest checked in', 'success');
      } else {
        await bookingService.checkOut(id, { notes });
        show('Guest checked out', 'success');
      }
      setCheckModal(null);
      setNotes('');
      await load();
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setBusyAction(null);
    }
  }

  if (loading) return <Loader label="Loading booking..." />;
  if (error || !booking) {
    return (
      <div className="error-state">
        <p>Could not load this booking{error ? `: ${error.message}` : '.'}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title-row">
            <h1 className="page-title">{booking.bookingNumber}</h1>
            <StatusBadge status={booking.status} />
          </div>
          <p className="page-subtitle">
            {booking.hotel?.name} &middot; {formatDate(booking.checkIn)} to {formatDate(booking.checkOut)}
          </p>
        </div>
        <div className="page-actions">
          <Button icon={<ArrowLeftIcon />} variant="primary" onClick={() => router.push('/admin/bookings')}>
            Back
          </Button>
          {canConfirm && ['pending', 'held'].includes(booking.status) && (
            <Button variant="primary" loading={busyAction === 'confirm'} onClick={handleConfirmAction}>
              Confirm
            </Button>
          )}
          {canCheckIn && booking.status === 'confirmed' && (
            <Button variant="secondary" onClick={() => setCheckModal('check-in')}>
              Check In
            </Button>
          )}
          {canCheckOut && booking.status === 'checked_in' && (
            <Button variant="secondary" onClick={() => setCheckModal('check-out')}>
              Check Out
            </Button>
          )}
          {canCancel && !['cancelled', 'checked_out', 'completed'].includes(booking.status) && (
            <Button variant="danger" onClick={() => setConfirmOpen(true)}>
              Cancel Booking
            </Button>
          )}
        </div>
      </div>

      <div className="detail-grid">
        <Card title="Booking Summary">
          <div className="detail-list">
            <div>
              <p className="detail-item__label">Customer</p>
              <p className="detail-item__value">
                {booking.customer ? `${booking.customer.firstName} ${booking.customer.lastName}` : '—'}
              </p>
            </div>
            <div>
              <p className="detail-item__label">Adults / Children</p>
              <p className="detail-item__value">
                {booking.adults} / {booking.children}
              </p>
            </div>
            <div>
              <p className="detail-item__label">Source</p>
              <p className="detail-item__value">{booking.source}</p>
            </div>
            <div>
              <p className="detail-item__label">Subtotal</p>
              <p className="detail-item__value">{formatCurrency(booking.subtotal, booking.currency)}</p>
            </div>
            <div>
              <p className="detail-item__label">Discount</p>
              <p className="detail-item__value">{formatCurrency(booking.discountAmount, booking.currency)}</p>
            </div>
            <div>
              <p className="detail-item__label">Tax</p>
              <p className="detail-item__value">{formatCurrency(booking.taxAmount, booking.currency)}</p>
            </div>
            <div>
              <p className="detail-item__label">Total</p>
              <p className="detail-item__value">{formatCurrency(booking.totalAmount, booking.currency)}</p>
            </div>
            <div>
              <p className="detail-item__label">Paid / Due</p>
              <p className="detail-item__value">
                {formatCurrency(booking.paidAmount, booking.currency)} / {formatCurrency(booking.dueAmount, booking.currency)}
              </p>
            </div>
          </div>
          {booking.specialRequests && (
            <p style={{ marginTop: 'var(--space-4)' }}>
              <span className="detail-item__label">Special Requests</span>
              <br />
              {booking.specialRequests}
            </p>
          )}
        </Card>

        <Card title="Status History">
          {booking.statusHistory?.length ? (
            <div className="timeline">
              {booking.statusHistory.map((h) => (
                <div key={h.id} className="timeline__item">
                  <span className="timeline__dot" />
                  <div className="timeline__body">
                    <p className="timeline__title">
                      {h.fromStatus ? `${h.fromStatus} → ${h.toStatus}` : `Created as ${h.toStatus}`}
                    </p>
                    <p className="timeline__meta">
                      {formatDateTime(h.createdAt)}
                      {h.reason ? ` — ${h.reason}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted">No status changes recorded.</p>
          )}
        </Card>
      </div>

      <Card title="Guests" style={{ marginTop: 'var(--space-5)' }}>
        <Table columns={GUEST_COLUMNS} rows={booking.guests || []} emptyMessage="No guests recorded." />
      </Card>

      <Card title="Rooms" style={{ marginTop: 'var(--space-5)' }}>
        <Table columns={ROOM_COLUMNS} rows={booking.bookingRooms || []} emptyMessage="No rooms recorded." />
      </Card>

      <Card title="Extra Services" style={{ marginTop: 'var(--space-5)' }}>
        <Table columns={SERVICE_COLUMNS} rows={booking.services || []} emptyMessage="No extra services." />
      </Card>

      <Card title="Payments" style={{ marginTop: 'var(--space-5)' }}>
        <Table columns={PAYMENT_COLUMNS} rows={booking.payments || []} emptyMessage="No payments recorded." />
      </Card>

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Cancel booking"
        loading={busyAction === 'cancel'}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleCancelAction}
        confirmLabel="Cancel Booking"
        message={
          <Textarea
            label="Cancellation reason (optional)"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Why is this booking being cancelled?"
          />
        }
      />

      <Modal
        isOpen={Boolean(checkModal)}
        onClose={() => setCheckModal(null)}
        title={checkModal === 'check-in' ? 'Check In Guest' : 'Check Out Guest'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCheckModal(null)}>
              Cancel
            </Button>
            <Button onClick={handleCheckAction} loading={busyAction === checkModal}>
              Confirm
            </Button>
          </>
        }
      >
        <Textarea label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Modal>
    </div>
  );
}

export default BookingDetail;
