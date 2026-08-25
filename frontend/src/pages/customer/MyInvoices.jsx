import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useResourceList } from '../../hooks/useResourceList.js';
import { Button, Card, Pagination, SearchFilterBar, StatusBadge, Table, useToast } from '../../components/ui/index.js';
import * as invoiceService from '../../services/invoiceService.js';
import { formatCurrency, formatDate, triggerBlobDownload } from '../../utils/format.js';

/** The logged-in customer's own invoices, with a PDF download action per row. */
export function MyInvoices() {
  const { show } = useToast();
  const list = useResourceList({ fetcher: invoiceService.list });
  const [downloadingId, setDownloadingId] = useState(null);

  async function handleDownload(invoice) {
    setDownloadingId(invoice.id);
    try {
      const blob = await invoiceService.downloadPdf(invoice.id);
      triggerBlobDownload(blob, `${invoice.invoiceNumber || 'invoice'}.pdf`);
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setDownloadingId(null);
    }
  }

  const columns = [
    { key: 'invoiceNumber', header: 'Invoice #' },
    {
      key: 'booking',
      header: 'Booking #',
      render: (row) => (row.booking ? <Link to={`/my-bookings/${row.booking.id}`}>{row.booking.bookingNumber}</Link> : '—'),
    },
    { key: 'totalAmount', header: 'Total', render: (row) => formatCurrency(row.totalAmount, row.currency) },
    { key: 'dueAmount', header: 'Due', render: (row) => formatCurrency(row.dueAmount, row.currency) },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'issuedAt', header: 'Issued', render: (row) => formatDate(row.issuedAt) },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <Button variant="ghost" loading={downloadingId === row.id} onClick={() => handleDownload(row)}>
          Download PDF
        </Button>
      ),
    },
  ];

  return (
    <div className="container page-section">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Invoices</h1>
          <p className="page-subtitle">Invoices issued for your bookings.</p>
        </div>
      </div>

      <Card>
        <SearchFilterBar search={list.search} onSearchChange={list.setSearch} searchPlaceholder="Search by invoice #..." />

        <Table columns={columns} rows={list.rows} loading={list.loading} emptyMessage="No invoices yet." />

        <Pagination
          page={list.page}
          limit={list.limit}
          total={list.meta.total}
          totalPages={list.meta.totalPages}
          onPageChange={list.setPage}
        />
      </Card>
    </div>
  );
}

export default MyInvoices;
