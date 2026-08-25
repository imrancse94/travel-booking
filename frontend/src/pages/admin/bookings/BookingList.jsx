import { Link } from 'react-router-dom';
import { useResourceList } from '../../../hooks/useResourceList.js';
import { Card, Pagination, SearchFilterBar, Select, StatusBadge, Table } from '../../../components/ui/index.js';
import * as bookingService from '../../../services/bookingService.js';
import { BOOKING_SOURCE_OPTIONS, BOOKING_STATUS_OPTIONS } from '../../../constants/options.js';
import { formatCurrency, formatDate } from '../../../utils/format.js';

const COLUMNS = [
  {
    key: 'bookingNumber',
    header: 'Booking #',
    sortable: true,
    render: (row) => <Link to={`/admin/bookings/${row.id}`}>{row.bookingNumber}</Link>,
  },
  {
    key: 'customer',
    header: 'Customer',
    render: (row) => (row.customer ? `${row.customer.firstName} ${row.customer.lastName}` : '—'),
  },
  { key: 'hotel', header: 'Hotel', render: (row) => row.hotel?.name || '—' },
  { key: 'checkIn', header: 'Check-in', sortable: true, render: (row) => formatDate(row.checkIn) },
  { key: 'checkOut', header: 'Check-out', sortable: true, render: (row) => formatDate(row.checkOut) },
  { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  { key: 'source', header: 'Source', render: (row) => <StatusBadge status={row.source} tone="neutral" /> },
  {
    key: 'totalAmount',
    header: 'Total',
    render: (row) => formatCurrency(row.totalAmount, row.currency),
  },
];

/** Admin bookings list: search, status/source filters, a check-in/out date range, sortable columns and pagination. */
export function BookingList() {
  const list = useResourceList({
    fetcher: bookingService.list,
    initialFilters: { status: '', source: '', checkInFrom: '', checkInTo: '' },
  });

  function updateFilter(key, value) {
    list.setFilters({ ...list.filters, [key]: value });
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Bookings</h1>
          <p className="page-subtitle">All hotel bookings across the agency.</p>
        </div>
      </div>

      <Card>
        <SearchFilterBar
          search={list.search}
          onSearchChange={list.setSearch}
          searchPlaceholder="Search by booking # or guest..."
          dateRange={{ from: list.filters.checkInFrom, to: list.filters.checkInTo }}
          onDateRangeChange={(range) => list.setFilters({ ...list.filters, checkInFrom: range.from, checkInTo: range.to })}
        >
          <Select
            value={list.filters.status}
            onChange={(e) => updateFilter('status', e.target.value)}
            placeholder="All statuses"
            options={BOOKING_STATUS_OPTIONS}
          />
          <Select
            value={list.filters.source}
            onChange={(e) => updateFilter('source', e.target.value)}
            placeholder="All sources"
            options={BOOKING_SOURCE_OPTIONS}
          />
        </SearchFilterBar>

        <Table
          columns={COLUMNS}
          rows={list.rows}
          loading={list.loading}
          sort={list.sort}
          onSortChange={list.setSort}
          emptyMessage="No bookings found."
        />

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

export default BookingList;
