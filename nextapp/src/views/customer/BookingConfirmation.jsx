'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button, Card, Loader, StatusBadge, Table } from '../../components/ui/index.js';
import * as bookingService from '../../services/bookingService.js';
import { formatCurrency, formatDate } from '../../utils/format.js';

const ROOM_COLUMNS = [
  { key: 'roomType', header: 'Room Type', render: (r) => r.roomType?.name || r.room?.roomType?.name || '—' },
  { key: 'checkIn', header: 'Check-in', render: (r) => formatDate(r.checkIn) },
  { key: 'checkOut', header: 'Check-out', render: (r) => formatDate(r.checkOut) },
  { key: 'nights', header: 'Nights' },
  { key: 'totalPrice', header: 'Total', render: (r) => formatCurrency(r.totalPrice, r.currency) },
];

/** Post-booking confirmation: booking number/status, hotel/dates/rooms, amounts, link to My Bookings. */
export function BookingConfirmation() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    bookingService
      .getById(id)
      .then((res) => !cancelled && setBooking(res.data))
      .catch((err) => !cancelled && setError(err))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) return <Loader label="Loading your booking..." />;
  if (error || !booking) {
    return (
      <div className="container page-section">
        <div className="error-state">
          <p>Could not load this booking{error ? `: ${error.message}` : '.'}</p>
        </div>
      </div>
    );
  }

  const isConfirmed = booking.status === 'confirmed';

  return (
    <div className="container page-section">
      <Card>
        <div className="confirmation-banner">
          <div className="confirmation-banner__icon">{isConfirmed ? '✅' : '⏳'}</div>
          <h1 className="page-title" style={{ marginTop: 'var(--space-3)' }}>
            {isConfirmed ? 'Booking Confirmed!' : 'Booking Received'}
          </h1>
          <p className="page-subtitle">
            Booking number <strong>{booking.bookingNumber}</strong>
          </p>
          <StatusBadge status={booking.status} />
          {!isConfirmed && (
            <p className="summary-note" style={{ marginTop: 'var(--space-3)' }}>
              Your booking is held while payment is processed. If it doesn&apos;t confirm shortly, retry payment from My
              Bookings.
            </p>
          )}
        </div>
      </Card>

      <div className="detail-grid" style={{ marginTop: 'var(--space-4)' }}>
        <Card title="Stay Details">
          <div className="detail-list">
            <div>
              <p className="detail-item__label">Hotel</p>
              <p className="detail-item__value">{booking.hotel?.name}</p>
            </div>
            <div>
              <p className="detail-item__label">Check-in</p>
              <p className="detail-item__value">{formatDate(booking.checkIn)}</p>
            </div>
            <div>
              <p className="detail-item__label">Check-out</p>
              <p className="detail-item__value">{formatDate(booking.checkOut)}</p>
            </div>
            <div>
              <p className="detail-item__label">Adults / Children</p>
              <p className="detail-item__value">
                {booking.adults} / {booking.children}
              </p>
            </div>
          </div>
        </Card>

        <Card title="Payment Summary">
          <div className="detail-list">
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
        </Card>
      </div>

      <Card title="Rooms" style={{ marginTop: 'var(--space-4)' }}>
        <Table columns={ROOM_COLUMNS} rows={booking.bookingRooms || []} emptyMessage="No rooms on this booking." />
      </Card>

      <div className="form-actions" style={{ borderTop: 'none', justifyContent: 'center' }}>
        <Button as={Link} href="/my-bookings">
          Go to My Bookings
        </Button>
        <Button as={Link} variant="secondary" href="/hotels">
          Book Another Stay
        </Button>
      </div>
    </div>
  );
}

export default BookingConfirmation;
