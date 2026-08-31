'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button, Card, Loader, StatusBadge, Table, useToast } from '../../../components/ui/index.js';
import * as invoiceService from '../../../services/invoiceService.js';
import { formatCurrency, formatDate, triggerBlobDownload } from '../../../utils/format.js';

const ITEM_COLUMNS = [
  { key: 'description', header: 'Description' },
  { key: 'quantity', header: 'Qty' },
  { key: 'unitPrice', header: 'Unit Price', render: (i) => formatCurrency(i.unitPrice) },
  { key: 'total', header: 'Total', render: (i) => formatCurrency(i.total) },
];

/** Invoice detail: company/customer/booking summary, line items, and a PDF download action. */
export function InvoiceDetail() {
  const { id } = useParams();
  const { show } = useToast();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    invoiceService
      .getById(id)
      .then((res) => !cancelled && setInvoice(res.data))
      .catch((err) => !cancelled && setError(err))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleDownload() {
    setDownloading(true);
    try {
      const blob = await invoiceService.downloadPdf(id);
      triggerBlobDownload(blob, `${invoice?.invoiceNumber || 'invoice'}.pdf`);
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setDownloading(false);
    }
  }

  if (loading) return <Loader label="Loading invoice..." />;
  if (error || !invoice) {
    return (
      <div className="error-state">
        <p>Could not load this invoice{error ? `: ${error.message}` : '.'}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{invoice.invoiceNumber}</h1>
          <p className="page-subtitle">
            {invoice.booking ? (
              <>
                Booking <Link href={`/admin/bookings/${invoice.booking.id}`}>{invoice.booking.bookingNumber}</Link>
              </>
            ) : (
              '—'
            )}
          </p>
        </div>
        <div className="page-actions">
          <StatusBadge status={invoice.status} />
          <Button variant="secondary" loading={downloading} onClick={handleDownload}>
            Download PDF
          </Button>
        </div>
      </div>

      <Card title="Summary">
        <div className="detail-list">
          <div>
            <p className="detail-item__label">Issued</p>
            <p className="detail-item__value">{formatDate(invoice.issuedAt)}</p>
          </div>
          <div>
            <p className="detail-item__label">Subtotal</p>
            <p className="detail-item__value">{formatCurrency(invoice.subtotal, invoice.currency)}</p>
          </div>
          <div>
            <p className="detail-item__label">Discount</p>
            <p className="detail-item__value">{formatCurrency(invoice.discountAmount, invoice.currency)}</p>
          </div>
          <div>
            <p className="detail-item__label">Tax</p>
            <p className="detail-item__value">{formatCurrency(invoice.taxAmount, invoice.currency)}</p>
          </div>
          <div>
            <p className="detail-item__label">Total</p>
            <p className="detail-item__value">{formatCurrency(invoice.totalAmount, invoice.currency)}</p>
          </div>
          <div>
            <p className="detail-item__label">Paid / Due</p>
            <p className="detail-item__value">
              {formatCurrency(invoice.paidAmount, invoice.currency)} / {formatCurrency(invoice.dueAmount, invoice.currency)}
            </p>
          </div>
        </div>
      </Card>

      <Card title="Line Items" style={{ marginTop: 'var(--space-5)' }}>
        <Table columns={ITEM_COLUMNS} rows={invoice.items || []} emptyMessage="No line items." />
      </Card>
    </div>
  );
}

export default InvoiceDetail;
