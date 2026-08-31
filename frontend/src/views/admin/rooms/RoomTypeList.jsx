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
  Pagination,
  SearchFilterBar,
  SectionTabs,
  Select,
  Table,
  useToast,
} from '../../../components/ui/index.js';
import * as roomTypeService from '../../../services/roomTypeService.js';
import * as hotelService from '../../../services/hotelService.js';
import { ROOM_SECTION_TABS } from './roomsNav.js';

/** Room types list, scoped to the Rooms sidebar section (Room Types / Rooms / Rate Plans tabs). */
export function RoomTypeList() {
  const router = useRouter();
  const { show } = useToast();
  const canCreate = usePermission('room_types.create');
  const canUpdate = usePermission('room_types.update');
  const canDelete = usePermission('room_types.delete');

  const [hotels, setHotels] = useState([]);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const list = useResourceList({ fetcher: roomTypeService.list, initialFilters: { hotelId: '' } });

  useEffect(() => {
    hotelService
      .list({ limit: 100 })
      .then((res) => setHotels(res.data || []))
      .catch(() => setHotels([]));
  }, []);

  const columns = [
    {
      key: 'name',
      header: 'Room Type',
      render: (row) => <Link href={`/admin/rooms/room-types/${row.id}/edit`}>{row.name}</Link>,
    },
    { key: 'hotel', header: 'Hotel', render: (row) => row.hotel?.name || '—' },
    { key: 'maxAdults', header: 'Max Adults' },
    { key: 'maxChildren', header: 'Max Children' },
    { key: 'bedType', header: 'Bed Type', render: (row) => row.bedType || '—' },
    { key: 'totalRooms', header: 'Total Rooms' },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="inline-actions">
          {canUpdate && (
            <Button variant="ghost" onClick={() => router.push(`/admin/rooms/room-types/${row.id}/edit`)}>
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
      await roomTypeService.remove(pendingDelete.id);
      show('Room type deleted', 'success');
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
      <SectionTabs tabs={ROOM_SECTION_TABS} />

      <div className="page-header">
        <div>
          <h1 className="page-title">Room Types</h1>
          <p className="page-subtitle">Standard, Deluxe, Suite and other room categories per hotel.</p>
        </div>
        <div className="page-actions">
          {canCreate && (
            <Button as={Link} href="/admin/rooms/room-types/new">
              + New Room Type
            </Button>
          )}
        </div>
      </div>

      <Card>
        <SearchFilterBar search={list.search} onSearchChange={list.setSearch} searchPlaceholder="Search room types...">
          <Select
            value={list.filters.hotelId}
            onChange={(e) => list.setFilters({ ...list.filters, hotelId: e.target.value })}
            placeholder="All hotels"
            options={hotels.map((h) => ({ value: h.id, label: h.name }))}
          />
        </SearchFilterBar>

        <Table columns={columns} rows={list.rows} loading={list.loading} emptyMessage="No room types found." />

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
        title="Delete room type"
        message={`Delete "${pendingDelete?.name}"? Rooms under this type must be removed first.`}
        loading={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

export default RoomTypeList;
