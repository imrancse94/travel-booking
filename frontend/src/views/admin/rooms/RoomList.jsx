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
import * as roomService from '../../../services/roomService.js';
import * as roomTypeService from '../../../services/roomTypeService.js';
import { ROOM_STATUS_OPTIONS } from '../../../constants/options.js';
import { ROOM_SECTION_TABS } from './roomsNav.js';
import { MAX_PAGE_SIZE } from '../../../constants/pagination.js';

/** Individual rooms list (room number, floor, status) scoped to a room type. */
export function RoomList() {
  const router = useRouter();
  const { show } = useToast();
  const canCreate = usePermission('rooms.create');
  const canUpdate = usePermission('rooms.update');
  const canDelete = usePermission('rooms.delete');

  const [roomTypes, setRoomTypes] = useState([]);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const list = useResourceList({ fetcher: roomService.list, initialFilters: { roomTypeId: '', status: '' } });

  useEffect(() => {
    roomTypeService
      .list({ limit: MAX_PAGE_SIZE })
      .then((res) => setRoomTypes(res.data || []))
      .catch(() => setRoomTypes([]));
  }, []);

  const columns = [
    { key: 'roomNumber', header: 'Room #', sortable: true },
    { key: 'roomType', header: 'Room Type', render: (row) => row.roomType?.name || '—' },
    { key: 'hotel', header: 'Hotel', render: (row) => row.roomType?.hotel?.name || '—' },
    { key: 'floor', header: 'Floor', render: (row) => row.floor || '—' },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'actions',
      header: 'Action',
      render: (row) => (
        <div className="inline-actions">
          {canUpdate && (
            <Button icon={<EditIcon />} variant="primary" onClick={() => router.push(`/admin/rooms/rooms/${row.id}/edit`)}>
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
      await roomService.remove(pendingDelete.id);
      show('Room deleted', 'success');
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
          <h1 className="page-title">Rooms</h1>
          <p className="page-subtitle">Individual physical rooms under each room type.</p>
        </div>
        <div className="page-actions">
          {canCreate && (
            <Button variant="success" as={Link} href="/admin/rooms/rooms/new" icon={<PlusCircleIcon />}>
              New Room
            </Button>
          )}
        </div>
      </div>

      <Card>
        <SearchFilterBar search={list.search} onSearchChange={list.setSearch} searchPlaceholder="Search by room number...">
          <Select
            value={list.filters.roomTypeId}
            onChange={(e) => list.setFilters({ ...list.filters, roomTypeId: e.target.value })}
            placeholder="All room types"
            options={roomTypes.map((rt) => ({ value: rt.id, label: `${rt.hotel?.name ? rt.hotel.name + ' - ' : ''}${rt.name}` }))}
          />
          <Select
            value={list.filters.status}
            onChange={(e) => list.setFilters({ ...list.filters, status: e.target.value })}
            placeholder="All statuses"
            options={ROOM_STATUS_OPTIONS}
          />
        </SearchFilterBar>

        <Table columns={columns} rows={list.rows} loading={list.loading} sort={list.sort} onSortChange={list.setSort} emptyMessage="No rooms found." />

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
        title="Delete room"
        message={`Delete room "${pendingDelete?.roomNumber}"?`}
        loading={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

export default RoomList;
