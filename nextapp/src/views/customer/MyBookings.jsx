'use client';

import Link from 'next/link';
import { useResourceList } from '../../hooks/useResourceList.js';
import { Card, Pagination, SearchFilterBar, Select, StatusBadge, Table } from '../../components/ui/index.js';
import * as bookingService from '../../services/bookingService.js';
import { BOOKING_STATUS_OPTIONS } from '../../constants/options.js';
import { formatCurrency, formatDate } from '../../utils/format.js';

const COLUMNS = [
  {
    key: 'bookingNumber',
    header: 'Booking #',
    render: (row) => <Link href={`/my-bookings/${row.id}`}>{row.bookingNumber}</Link>,
  },
  { key: 'hotel', header: 'Hotel', render: (row) => row.hotel?.name || '—' },
  { key: 'checkIn', header: 'Check-in', render: (row) => formatDate(row.checkIn) },
  { key: 'checkOut', header: 'Check-out', render: (row) => formatDate(row.checkOut) },
  { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  { key: 'totalAmount', header: 'Total', render: (row) => formatCurrency(row.totalAmount, row.currency) },
];

/** The logged-in customer's own bookings (server-scoped -- no customerId filter needed client-side). */
export function MyBookings() {
  const list = useResourceList({ fetcher: bookingService.list, initialFilters: { status: '' } });

  return (
    <div className="container page-section">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Bookings</h1>
          <p className="page-subtitle">All your hotel bookings, past and upcoming.</p>
        </div>
      </div>

      <Card>
        <SearchFilterBar search={list.search} onSearchChange={list.setSearch} searchPlaceholder="Search by booking #...">
          <Select
            value={list.filters.status}
            onChange={(e) => list.setFilters({ ...list.filters, status: e.target.value })}
            placeholder="All statuses"
            options={BOOKING_STATUS_OPTIONS}
          />
        </SearchFilterBar>

        <Table columns={COLUMNS} rows={list.rows} loading={list.loading} emptyMessage="You have no bookings yet." />

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

export default MyBookings;
