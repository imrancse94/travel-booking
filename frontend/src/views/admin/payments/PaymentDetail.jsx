'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Button,
  Card,
  Input,
  Loader,
  Modal,
  StatusBadge,
  Table,
  Textarea,
  useToast,
} from '../../../components/ui/index.js';
import { usePermission } from '../../../hooks/usePermission.js';
import * as paymentService from '../../../services/paymentService.js';
import * as refundService from '../../../services/refundService.js';
import { formatCurrency, formatDateTime } from '../../../utils/format.js';

const REFUND_COLUMNS = [
  { key: 'amount', header: 'Amount', render: (r) => formatCurrency(r.amount) },
  { key: 'reason', header: 'Reason', render: (r) => r.reason || '—' },
  { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  { key: 'processedAt', header: 'Processed At', render: (r) => formatDateTime(r.processedAt) },
];

/** Payment detail with its refund history and a refund action. */
export function PaymentDetail() {
  const { id } = useParams();
  const { show } = useToast();
  const canRefund = usePermission('payments.refund');

  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    return paymentService
      .getById(id)
      .then((res) => setPayment(res.data))
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRefund(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await refundService.create({ paymentId: id, amount: Number(refundAmount), reason: refundReason });
      show('Refund submitted', 'success');
      setRefundOpen(false);
      setRefundAmount('');
      setRefundReason('');
      await load();
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Loader label="Loading payment..." />;
  if (error || !payment) {
    return (
      <div className="error-state">
        <p>Could not load this payment{error ? `: ${error.message}` : '.'}</p>
      </div>
    );
  }

  const refunds = payment.refunds || [];
  const canBeRefunded = ['paid', 'partially_refunded'].includes(payment.status);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Payment {payment.transactionId || payment.id}</h1>
          <p className="page-subtitle">
            {payment.booking ? (
              <>
                For booking <Link href={`/admin/bookings/${payment.booking.id}`}>{payment.booking.bookingNumber}</Link>
              </>
            ) : (
              '—'
            )}
          </p>
        </div>
        <div className="page-actions">
          <StatusBadge status={payment.status} />
          {canRefund && canBeRefunded && <Button variant="danger" onClick={() => setRefundOpen(true)}>Refund</Button>}
        </div>
      </div>

      <Card title="Payment Details">
        <div className="detail-list">
          <div>
            <p className="detail-item__label">Amount</p>
            <p className="detail-item__value">{formatCurrency(payment.amount, payment.currency)}</p>
          </div>
          <div>
            <p className="detail-item__label">Method</p>
            <p className="detail-item__value">{payment.method}</p>
          </div>
          <div>
            <p className="detail-item__label">Gateway</p>
            <p className="detail-item__value">{payment.gateway || '—'}</p>
          </div>
          <div>
            <p className="detail-item__label">Paid At</p>
            <p className="detail-item__value">{formatDateTime(payment.paidAt)}</p>
          </div>
        </div>
      </Card>

      <Card title="Refunds" style={{ marginTop: 'var(--space-5)' }}>
        <Table columns={REFUND_COLUMNS} rows={refunds} emptyMessage="No refunds issued." />
      </Card>

      <Modal
        isOpen={refundOpen}
        onClose={() => setRefundOpen(false)}
        title="Issue Refund"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRefundOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleRefund} loading={submitting}>
              Submit Refund
            </Button>
          </>
        }
      >
        <form onSubmit={handleRefund}>
          <Input
            label="Refund Amount"
            type="number"
            step="0.01"
            max={payment.amount}
            required
            value={refundAmount}
            onChange={(e) => setRefundAmount(e.target.value)}
            hint={`Up to ${formatCurrency(payment.amount, payment.currency)}`}
          />
          <Textarea label="Reason" value={refundReason} onChange={(e) => setRefundReason(e.target.value)} />
        </form>
      </Modal>
    </div>
  );
}

export default PaymentDetail;
