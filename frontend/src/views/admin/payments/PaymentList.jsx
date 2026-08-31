'use client';

import Link from 'next/link';
import { useResourceList } from '../../../hooks/useResourceList.js';
import { Card, Pagination, SearchFilterBar, Select, StatusBadge, Table } from '../../../components/ui/index.js';
import * as paymentService from '../../../services/paymentService.js';
import { PAYMENT_METHOD_OPTIONS, PAYMENT_STATUS_OPTIONS } from '../../../constants/options.js';
import { formatCurrency, formatDateTime } from '../../../utils/format.js';

const COLUMNS = [
  {
    key: 'bookingNumber',
    header: 'Booking #',
    render: (row) => (row.booking ? <Link href={`/admin/bookings/${row.booking.id}`}>{row.booking.bookingNumber}</Link> : '—'),
  },
  { key: 'method', header: 'Method', render: (row) => <StatusBadge status={row.method} tone="neutral" /> },
  { key: 'amount', header: 'Amount', render: (row) => formatCurrency(row.amount, row.currency) },
  { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  { key: 'paidAt', header: 'Paid At', render: (row) => formatDateTime(row.paidAt) },
  {
    key: 'actions',
    header: '',
    render: (row) => <Link href={`/admin/payments/${row.id}`}>View</Link>,
  },
];

/** Payments list: search, status/method filters, and a paid-date range. */
export function PaymentList() {
  const list = useResourceList({
    fetcher: paymentService.list,
    initialFilters: { status: '', method: '', paidFrom: '', paidTo: '' },
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Payments</h1>
          <p className="page-subtitle">All recorded payments across bookings.</p>
        </div>
      </div>

      <Card>
        <SearchFilterBar
          search={list.search}
          onSearchChange={list.setSearch}
          searchPlaceholder="Search by transaction ID..."
          dateRange={{ from: list.filters.paidFrom, to: list.filters.paidTo }}
          onDateRangeChange={(range) => list.setFilters({ ...list.filters, paidFrom: range.from, paidTo: range.to })}
        >
          <Select
            value={list.filters.status}
            onChange={(e) => list.setFilters({ ...list.filters, status: e.target.value })}
            placeholder="All statuses"
            options={PAYMENT_STATUS_OPTIONS}
          />
          <Select
            value={list.filters.method}
            onChange={(e) => list.setFilters({ ...list.filters, method: e.target.value })}
            placeholder="All methods"
            options={PAYMENT_METHOD_OPTIONS}
          />
        </SearchFilterBar>

        <Table columns={COLUMNS} rows={list.rows} loading={list.loading} emptyMessage="No payments found." />

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

export default PaymentList;
