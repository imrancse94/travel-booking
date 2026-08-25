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
import * as destinationService from '../../../services/destinationService.js';
import { ENTITY_STATUS_OPTIONS } from '../../../constants/options.js';

/** Destinations list with search + status filter and row actions. */
export function DestinationList() {
  const navigate = useNavigate();
  const { show } = useToast();
  const canCreate = usePermission('destinations.create');
  const canUpdate = usePermission('destinations.update');
  const canDelete = usePermission('destinations.delete');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const list = useResourceList({ fetcher: destinationService.list, initialFilters: { status: '' } });

  const columns = [
    { key: 'name', header: 'Destination', render: (row) => <Link to={`/admin/destinations/${row.id}/edit`}>{row.name}</Link> },
    { key: 'country', header: 'Country', render: (row) => row.country || '—' },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="inline-actions">
          {canUpdate && (
            <Button variant="ghost" onClick={() => navigate(`/admin/destinations/${row.id}/edit`)}>
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
      await destinationService.remove(pendingDelete.id);
      show('Destination deleted', 'success');
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
          <h1 className="page-title">Destinations</h1>
          <p className="page-subtitle">Travel destinations offered by the agency.</p>
        </div>
        <div className="page-actions">
          {canCreate && (
            <Button as={Link} to="/admin/destinations/new">
              + New Destination
            </Button>
          )}
        </div>
      </div>

      <Card>
        <SearchFilterBar search={list.search} onSearchChange={list.setSearch} searchPlaceholder="Search destinations...">
          <Select
            value={list.filters.status}
            onChange={(e) => list.setFilters({ ...list.filters, status: e.target.value })}
            placeholder="All statuses"
            options={ENTITY_STATUS_OPTIONS}
          />
        </SearchFilterBar>

        <Table columns={columns} rows={list.rows} loading={list.loading} emptyMessage="No destinations found." />

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
        title="Delete destination"
        message={`Delete "${pendingDelete?.name}"?`}
        loading={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

export default DestinationList;
