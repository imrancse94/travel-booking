'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useResourceList } from '../../../hooks/useResourceList.js';
import { usePermission } from '../../../hooks/usePermission.js';
import {
  Button,
  Card,
  ConfirmDialog,
  EditIcon,
  Pagination,
  PlusCircleIcon,
  SearchFilterBar,
  SectionTabs,
  Select,
  StatusBadge,
  Table,
  TrashIcon,
  useToast,
} from '../../../components/ui/index.js';
import * as tourService from '../../../services/tourService.js';
import * as destinationService from '../../../services/destinationService.js';
import { ENTITY_STATUS_OPTIONS } from '../../../constants/options.js';
import { formatCurrency } from '../../../utils/format.js';
import { TOUR_SECTION_TABS } from './toursNav.js';

/** Tour packages list, scoped to the Tours sidebar section (Tour Packages / Tour Bookings tabs). */
export function TourPackageList() {
  const router = useRouter();
  const { show } = useToast();
  const canCreate = usePermission('tours.create');
  const canUpdate = usePermission('tours.update');
  const canDelete = usePermission('tours.delete');

  const [destinations, setDestinations] = useState([]);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const list = useResourceList({ fetcher: tourService.listPackages, initialFilters: { destinationId: '', status: '' } });

  useEffect(() => {
    destinationService
      .list({ limit: 100 })
      .then((res) => setDestinations(res.data || []))
      .catch(() => setDestinations([]));
  }, []);

  const columns = [
    {
      key: 'name',
      header: 'Package',
      render: (row) => <Link href={`/admin/tours/packages/${row.id}/edit`}>{row.name}</Link>,
    },
    { key: 'destination', header: 'Destination', render: (row) => row.destination?.name || '—' },
    { key: 'durationDays', header: 'Duration', render: (row) => `${row.durationDays} day(s)` },
    { key: 'price', header: 'Price', render: (row) => formatCurrency(row.price, row.currency) },
    { key: 'maxParticipants', header: 'Max Participants' },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'actions',
      header: 'Action',
      render: (row) => (
        <div className="inline-actions">
          {canUpdate && (
            <Button icon={<EditIcon />} variant="primary" onClick={() => router.push(`/admin/tours/packages/${row.id}/edit`)}>
              Edit
            </Button>
          )}
          {canDelete && (
            <Button icon={<TrashIcon />} variant="danger" onClick={() => setPendingDelete(row)}>
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
      await tourService.removePackage(pendingDelete.id);
      show('Tour package deleted', 'success');
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
      <SectionTabs tabs={TOUR_SECTION_TABS} />

      <div className="page-header">
        <div>
          <h1 className="page-title">Tour Packages</h1>
          <p className="page-subtitle">Manage tour packages and their itineraries.</p>
        </div>
        <div className="page-actions">
          {canCreate && (
            <Button variant="success" as={Link} href="/admin/tours/packages/new" icon={<PlusCircleIcon />}>
              New Package
            </Button>
          )}
        </div>
      </div>

      <Card>
        <SearchFilterBar search={list.search} onSearchChange={list.setSearch} searchPlaceholder="Search packages...">
          <Select
            value={list.filters.destinationId}
            onChange={(e) => list.setFilters({ ...list.filters, destinationId: e.target.value })}
            placeholder="All destinations"
            options={destinations.map((d) => ({ value: d.id, label: d.name }))}
          />
          <Select
            value={list.filters.status}
            onChange={(e) => list.setFilters({ ...list.filters, status: e.target.value })}
            placeholder="All statuses"
            options={ENTITY_STATUS_OPTIONS}
          />
        </SearchFilterBar>

        <Table columns={columns} rows={list.rows} loading={list.loading} emptyMessage="No tour packages found." />

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
        title="Delete tour package"
        message={`Delete "${pendingDelete?.name}"?`}
        loading={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

export default TourPackageList;
