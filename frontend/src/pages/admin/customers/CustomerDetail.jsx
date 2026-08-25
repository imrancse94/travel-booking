import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Card, Loader, StatusBadge, Table } from '../../../components/ui/index.js';
import * as customerService from '../../../services/customerService.js';
import { formatCurrency, formatDate } from '../../../utils/format.js';

const BOOKING_COLUMNS = [
  { key: 'bookingNumber', header: 'Booking #', render: (b) => <Link to={`/admin/bookings/${b.id}`}>{b.bookingNumber}</Link> },
  { key: 'hotel', header: 'Hotel', render: (b) => b.hotel?.name || '—' },
  { key: 'checkIn', header: 'Check-in', render: (b) => formatDate(b.checkIn) },
  { key: 'checkOut', header: 'Check-out', render: (b) => formatDate(b.checkOut) },
  { key: 'status', header: 'Status', render: (b) => <StatusBadge status={b.status} /> },
  { key: 'totalAmount', header: 'Total', render: (b) => formatCurrency(b.totalAmount, b.currency) },
];

const PAYMENT_COLUMNS = [
  { key: 'bookingNumber', header: 'Booking #', render: (p) => p.booking?.bookingNumber || '—' },
  { key: 'method', header: 'Method', render: (p) => <StatusBadge status={p.method} tone="neutral" /> },
  { key: 'amount', header: 'Amount', render: (p) => formatCurrency(p.amount, p.currency) },
  { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
  { key: 'paidAt', header: 'Paid At', render: (p) => formatDate(p.paidAt) },
];

/** Customer profile: contact/passport info plus booking and payment history. */
export function CustomerDetail() {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      customerService.getById(id),
      customerService.getBookingHistory(id).catch(() => ({ data: [] })),
      customerService.getPaymentHistory(id).catch(() => ({ data: [] })),
    ])
      .then(([customerRes, bookingsRes, paymentsRes]) => {
        if (cancelled) return;
        setCustomer(customerRes.data);
        setBookings(bookingsRes.data || []);
        setPayments(paymentsRes.data || []);
      })
      .catch((err) => !cancelled && setError(err))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) return <Loader label="Loading customer..." />;
  if (error || !customer) {
    return (
      <div className="error-state">
        <p>Could not load this customer{error ? `: ${error.message}` : '.'}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{customer.firstName} {customer.lastName}</h1>
          <p className="page-subtitle">{customer.email}</p>
        </div>
      </div>

      <Card title="Profile">
        <div className="detail-list">
          <div>
            <p className="detail-item__label">Phone</p>
            <p className="detail-item__value">{customer.phone || '—'}</p>
          </div>
          <div>
            <p className="detail-item__label">Nationality</p>
            <p className="detail-item__value">{customer.nationality || '—'}</p>
          </div>
          <div>
            <p className="detail-item__label">Date of Birth</p>
            <p className="detail-item__value">{formatDate(customer.dateOfBirth)}</p>
          </div>
          <div>
            <p className="detail-item__label">Passport Number</p>
            <p className="detail-item__value">{customer.passportNumber || '—'}</p>
          </div>
          <div>
            <p className="detail-item__label">Passport Expiry</p>
            <p className="detail-item__value">{formatDate(customer.passportExpiry)}</p>
          </div>
          <div>
            <p className="detail-item__label">Address</p>
            <p className="detail-item__value">{customer.address || '—'}</p>
          </div>
        </div>
      </Card>

      <Card title="Booking History" style={{ marginTop: 'var(--space-5)' }}>
        <Table columns={BOOKING_COLUMNS} rows={bookings} emptyMessage="No bookings yet." />
      </Card>

      <Card title="Payment History" style={{ marginTop: 'var(--space-5)' }}>
        <Table columns={PAYMENT_COLUMNS} rows={payments} emptyMessage="No payments yet." />
      </Card>
    </div>
  );
}

export default CustomerDetail;
