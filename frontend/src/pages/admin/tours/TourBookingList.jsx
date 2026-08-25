import { useState } from 'react';
import { useResourceList } from '../../../hooks/useResourceList.js';
import { usePermission } from '../../../hooks/usePermission.js';
import {
  Button,
  Card,
  Pagination,
  SearchFilterBar,
  SectionTabs,
  Select,
  StatusBadge,
  Table,
  useToast,
} from '../../../components/ui/index.js';
import * as tourService from '../../../services/tourService.js';
import { TOUR_BOOKING_STATUS_OPTIONS } from '../../../constants/options.js';
import { formatCurrency, formatDate } from '../../../utils/format.js';
import { TOUR_SECTION_TABS } from './toursNav.js';

/** Tour bookings list with a status filter and inline confirm/cancel actions. */
export function TourBookingList() {
  const { show } = useToast();
  const canUpdate = usePermission('tour_bookings.update');
  const [busyId, setBusyId] = useState(null);

  const list = useResourceList({ fetcher: tourService.listBookings, initialFilters: { status: '' } });

  async function updateStatus(booking, status) {
    setBusyId(booking.id);
    try {
      await tourService.updateBooking(booking.id, { status });
      show('Tour booking updated', 'success');
      list.reload();
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setBusyId(null);
    }
  }

  const columns = [
    { key: 'bookingNumber', header: 'Booking #' },
    { key: 'tourPackage', header: 'Package', render: (row) => row.tourPackage?.name || '—' },
    {
      key: 'customer',
      header: 'Customer',
      render: (row) => (row.customer ? `${row.customer.firstName} ${row.customer.lastName}` : '—'),
    },
    { key: 'participants', header: 'Participants' },
    { key: 'travelDate', header: 'Travel Date', render: (row) => formatDate(row.travelDate) },
    { key: 'totalAmount', header: 'Total', render: (row) => formatCurrency(row.totalAmount, row.currency) },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    ...(canUpdate
      ? [
          {
            key: 'actions',
            header: '',
            render: (row) => (
              <div className="inline-actions">
                {row.status === 'pending' && (
                  <Button variant="ghost" loading={busyId === row.id} onClick={() => updateStatus(row, 'confirmed')}>
                    Confirm
                  </Button>
                )}
                {!['cancelled', 'completed'].includes(row.status) && (
                  <Button variant="ghost" loading={busyId === row.id} onClick={() => updateStatus(row, 'cancelled')}>
                    Cancel
                  </Button>
                )}
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      <SectionTabs tabs={TOUR_SECTION_TABS} />

      <div className="page-header">
        <div>
          <h1 className="page-title">Tour Bookings</h1>
          <p className="page-subtitle">Customer bookings for tour packages.</p>
        </div>
      </div>

      <Card>
        <SearchFilterBar search={list.search} onSearchChange={list.setSearch} searchPlaceholder="Search by booking # or customer...">
          <Select
            value={list.filters.status}
            onChange={(e) => list.setFilters({ ...list.filters, status: e.target.value })}
            placeholder="All statuses"
            options={TOUR_BOOKING_STATUS_OPTIONS}
          />
        </SearchFilterBar>

        <Table columns={columns} rows={list.rows} loading={list.loading} emptyMessage="No tour bookings found." />

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

export default TourBookingList;
