'use client';

import { useEffect, useState } from 'react';
import { useResourceList } from '../../../hooks/useResourceList.js';
import { usePermission } from '../../../hooks/usePermission.js';
import {
  Button,
  Card,
  Input,
  Modal,
  Pagination,
  PlusCircleIcon,
  SearchFilterBar,
  SectionTabs,
  Select,
  StatusBadge,
  Table,
  useToast,
} from '../../../components/ui/index.js';
import * as transportService from '../../../services/transportService.js';
import { TRANSPORT_BOOKING_STATUS_OPTIONS } from '../../../constants/options.js';
import { formatCurrency, formatDate } from '../../../utils/format.js';
import { TRANSPORT_SECTION_TABS } from './transportNav.js';
import { MAX_PAGE_SIZE } from '../../../constants/pagination.js';

const EMPTY_FORM = { pickup: '', dropoff: '', date: '', time: '', vehicleId: '', driverId: '', price: '' };

/** Transport bookings list with an inline create modal and status filter. */
export function TransportBookingList() {
  const { show } = useToast();
  const canCreate = usePermission('transport.create');
  const canUpdate = usePermission('transport.update');

  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const list = useResourceList({ fetcher: transportService.listBookings, initialFilters: { status: '' } });

  useEffect(() => {
    transportService
      .listVehicles({ limit: MAX_PAGE_SIZE })
      .then((res) => setVehicles(res.data || []))
      .catch(() => setVehicles([]));
    transportService
      .listDrivers({ limit: MAX_PAGE_SIZE })
      .then((res) => setDrivers(res.data || []))
      .catch(() => setDrivers([]));
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await transportService.createBooking({ ...form, price: Number(form.price), driverId: form.driverId || null });
      show('Transport booking created', 'success');
      setModalOpen(false);
      setForm(EMPTY_FORM);
      list.reload();
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(booking, status) {
    setBusyId(booking.id);
    try {
      await transportService.updateBooking(booking.id, { status });
      show('Booking updated', 'success');
      list.reload();
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setBusyId(null);
    }
  }

  const columns = [
    { key: 'pickup', header: 'Pickup' },
    { key: 'dropoff', header: 'Drop-off' },
    { key: 'date', header: 'Date', render: (row) => formatDate(row.date) },
    { key: 'time', header: 'Time' },
    { key: 'vehicle', header: 'Vehicle', render: (row) => row.vehicle?.registrationNumber || '—' },
    { key: 'driver', header: 'Driver', render: (row) => row.driver?.name || '—' },
    { key: 'price', header: 'Price', render: (row) => formatCurrency(row.price) },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    ...(canUpdate
      ? [
          {
            key: 'actions',
            header: 'Action',
            render: (row) => (
              <div className="inline-actions">
                {row.status === 'pending' && (
                  <Button variant="ghost" loading={busyId === row.id} onClick={() => updateStatus(row, 'confirmed')}>
                    Confirm
                  </Button>
                )}
                {!['completed', 'cancelled'].includes(row.status) && (
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
      <SectionTabs tabs={TRANSPORT_SECTION_TABS} />

      <div className="page-header">
        <div>
          <h1 className="page-title">Transport Bookings</h1>
          <p className="page-subtitle">Pickup/drop-off bookings for customers and tours.</p>
        </div>
        <div className="page-actions">
          {canCreate && (
            <Button variant="success" onClick={() => setModalOpen(true)} icon={<PlusCircleIcon />}>
              New Transport Booking
            </Button>
          )}
        </div>
      </div>

      <Card>
        <SearchFilterBar search={list.search} onSearchChange={list.setSearch} searchPlaceholder="Search by pickup/drop-off...">
          <Select
            value={list.filters.status}
            onChange={(e) => list.setFilters({ ...list.filters, status: e.target.value })}
            placeholder="All statuses"
            options={TRANSPORT_BOOKING_STATUS_OPTIONS}
          />
        </SearchFilterBar>

        <Table columns={columns} rows={list.rows} loading={list.loading} emptyMessage="No transport bookings found." />

        <Pagination
          page={list.page}
          limit={list.limit}
          total={list.meta.total}
          totalPages={list.meta.totalPages}
          onPageChange={list.setPage}
        />
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New Transport Booking"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              Save
            </Button>
          </>
        }
      >
        <form onSubmit={handleSave}>
          <div className="form-grid">
            <Input label="Pickup" required value={form.pickup} onChange={(e) => setForm({ ...form, pickup: e.target.value })} />
            <Input label="Drop-off" required value={form.dropoff} onChange={(e) => setForm({ ...form, dropoff: e.target.value })} />
            <Input label="Date" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <Input label="Time" type="time" required value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
            <Select
              label="Vehicle"
              required
              value={form.vehicleId}
              onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
              placeholder="Select a vehicle"
              options={vehicles.map((v) => ({ value: v.id, label: v.registrationNumber }))}
            />
            <Select
              label="Driver"
              value={form.driverId}
              onChange={(e) => setForm({ ...form, driverId: e.target.value })}
              placeholder="Unassigned"
              options={drivers.map((d) => ({ value: d.id, label: d.name }))}
            />
            <Input label="Price" type="number" step="0.01" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default TransportBookingList;
