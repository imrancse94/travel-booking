import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useResourceList } from '../../../hooks/useResourceList.js';
import { usePermission } from '../../../hooks/usePermission.js';
import {
  Button,
  Card,
  ConfirmDialog,
  Pagination,
  SearchFilterBar,
  Select,
  StatusBadge,
  Table,
  useToast,
} from '../../../components/ui/index.js';
import * as hotelService from '../../../services/hotelService.js';
import { HOTEL_STATUS_OPTIONS } from '../../../constants/options.js';

/** Hotels list: search by name/city, filter by status, row actions to view/edit/delete. */
export function HotelList() {
  const navigate = useNavigate();
  const { show } = useToast();
  const canCreate = usePermission('hotels.create');
  const canUpdate = usePermission('hotels.update');
  const canDelete = usePermission('hotels.delete');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const list = useResourceList({ fetcher: hotelService.list, initialFilters: { status: '' } });

  const columns = [
    {
      key: 'name',
      header: 'Hotel',
      sortable: true,
      render: (row) => <Link to={`/admin/hotels/${row.id}`}>{row.name}</Link>,
    },
    { key: 'city', header: 'City', render: (row) => [row.city, row.country].filter(Boolean).join(', ') || '—' },
    { key: 'starRating', header: 'Rating', render: (row) => (row.starRating ? '★'.repeat(row.starRating) : '—') },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="inline-actions">
          {canUpdate && (
            <Button variant="ghost" onClick={() => navigate(`/admin/hotels/${row.id}/edit`)}>
              Edit
            </Button>
          )}
          {canDelete && (
            <Button variant="ghost" onClick={() => setPendingDelete(row)}>
              Delete
            </Button>
          )}
        </div>
      ),
    },
  ];

  async function handleDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await hotelService.remove(pendingDelete.id);
      show('Hotel deleted', 'success');
      setPendingDelete(null);
      list.reload();
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Hotels</h1>
          <p className="page-subtitle">Manage properties across the agency.</p>
        </div>
        <div className="page-actions">
          {canCreate && (
            <Button as={Link} to="/admin/hotels/new">
              + New Hotel
            </Button>
          )}
        </div>
      </div>

      <Card>
        <SearchFilterBar search={list.search} onSearchChange={list.setSearch} searchPlaceholder="Search by name or city...">
          <Select
            value={list.filters.status}
            onChange={(e) => list.setFilters({ ...list.filters, status: e.target.value })}
            placeholder="All statuses"
            options={HOTEL_STATUS_OPTIONS}
          />
        </SearchFilterBar>

        <Table columns={columns} rows={list.rows} loading={list.loading} emptyMessage="No hotels found." />

        <Pagination
          page={list.page}
          limit={list.limit}
          total={list.meta.total}
          totalPages={list.meta.totalPages}
          onPageChange={list.setPage}
        />
      </Card>

      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        title="Delete hotel"
        message={`Delete "${pendingDelete?.name}"? This cannot be undone.`}
        loading={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

export default HotelList;
