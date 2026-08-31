'use client';

import Link from 'next/link';
import { useResourceList } from '../../../hooks/useResourceList.js';
import { Card, Pagination, SearchFilterBar, Select, StatusBadge, Table } from '../../../components/ui/index.js';
import * as invoiceService from '../../../services/invoiceService.js';
import { INVOICE_STATUS_OPTIONS } from '../../../constants/options.js';
import { formatCurrency, formatDate } from '../../../utils/format.js';

const COLUMNS = [
  { key: 'invoiceNumber', header: 'Invoice #', render: (row) => <Link href={`/admin/invoices/${row.id}`}>{row.invoiceNumber}</Link> },
  {
    key: 'booking',
    header: 'Booking #',
    render: (row) => (row.booking ? <Link href={`/admin/bookings/${row.booking.id}`}>{row.booking.bookingNumber}</Link> : '—'),
  },
  { key: 'totalAmount', header: 'Total', render: (row) => formatCurrency(row.totalAmount, row.currency) },
  { key: 'dueAmount', header: 'Due', render: (row) => formatCurrency(row.dueAmount, row.currency) },
  { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  { key: 'issuedAt', header: 'Issued', render: (row) => formatDate(row.issuedAt) },
];

/** Invoices list with search + status filter. */
export function InvoiceList() {
  const list = useResourceList({ fetcher: invoiceService.list, initialFilters: { status: '' } });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="page-subtitle">Generated invoices for bookings.</p>
        </div>
      </div>

      <Card>
        <SearchFilterBar search={list.search} onSearchChange={list.setSearch} searchPlaceholder="Search by invoice #...">
          <Select
            value={list.filters.status}
            onChange={(e) => list.setFilters({ ...list.filters, status: e.target.value })}
            placeholder="All statuses"
            options={INVOICE_STATUS_OPTIONS}
          />
        </SearchFilterBar>

        <Table columns={COLUMNS} rows={list.rows} loading={list.loading} emptyMessage="No invoices found." />

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

export default InvoiceList;
