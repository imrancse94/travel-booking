import { useState } from 'react';
import { useResourceList } from '../../../hooks/useResourceList.js';
import { usePermission } from '../../../hooks/usePermission.js';
import {
  Button,
  Card,
  ConfirmDialog,
  Input,
  Modal,
  Pagination,
  SearchFilterBar,
  SectionTabs,
  Select,
  StatusBadge,
  Table,
  useToast,
} from '../../../components/ui/index.js';
import * as transportService from '../../../services/transportService.js';
import { VEHICLE_STATUS_OPTIONS, VEHICLE_TYPE_OPTIONS } from '../../../constants/options.js';
import { TRANSPORT_SECTION_TABS } from './transportNav.js';

const EMPTY_FORM = { type: 'car', registrationNumber: '', capacity: 4, status: 'available' };

/** Vehicle fleet list with an inline create/edit modal. */
export function VehicleList() {
  const { show } = useToast();
  const canCreate = usePermission('transport.create');
  const canUpdate = usePermission('transport.update');
  const canDelete = usePermission('transport.delete');

  const list = useResourceList({ fetcher: transportService.listVehicles, initialFilters: { status: '' } });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(vehicle) {
    setEditing(vehicle);
    setForm({ type: vehicle.type, registrationNumber: vehicle.registrationNumber, capacity: vehicle.capacity, status: vehicle.status });
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, capacity: Number(form.capacity) };
    try {
      if (editing) {
        await transportService.updateVehicle(editing.id, payload);
      } else {
        await transportService.createVehicle(payload);
      }
      show(editing ? 'Vehicle updated' : 'Vehicle created', 'success');
      setModalOpen(false);
      list.reload();
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await transportService.removeVehicle(pendingDelete.id);
      show('Vehicle deleted', 'success');
      setPendingDelete(null);
      list.reload();
    } catch (err) {
      show(err.message, 'error');
    }
  }

  const columns = [
    { key: 'registrationNumber', header: 'Registration #' },
    { key: 'type', header: 'Type', render: (v) => VEHICLE_TYPE_OPTIONS.find((o) => o.value === v.type)?.label || v.type },
    { key: 'capacity', header: 'Capacity' },
    { key: 'status', header: 'Status', render: (v) => <StatusBadge status={v.status} /> },
    {
      key: 'actions',
      header: '',
      render: (v) => (
        <div className="inline-actions">
          {canUpdate && (
            <Button variant="ghost" onClick={() => openEdit(v)}>
              Edit
            </Button>
          )}
          {canDelete && (
            <Button variant="ghost" onClick={() => setPendingDelete(v)}>
              Delete
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <SectionTabs tabs={TRANSPORT_SECTION_TABS} />

      <div className="page-header">
        <div>
          <h1 className="page-title">Vehicles</h1>
          <p className="page-subtitle">Cars, microbuses, buses, vans and minibuses in the fleet.</p>
        </div>
        <div className="page-actions">{canCreate && <Button onClick={openCreate}>+ New Vehicle</Button>}</div>
      </div>

      <Card>
        <SearchFilterBar search={list.search} onSearchChange={list.setSearch} searchPlaceholder="Search by registration number...">
          <Select
            value={list.filters.status}
            onChange={(e) => list.setFilters({ ...list.filters, status: e.target.value })}
            placeholder="All statuses"
            options={VEHICLE_STATUS_OPTIONS}
          />
        </SearchFilterBar>

        <Table columns={columns} rows={list.rows} loading={list.loading} emptyMessage="No vehicles found." />

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
        title={editing ? 'Edit Vehicle' : 'New Vehicle'}
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
            <Select
              label="Type"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              options={VEHICLE_TYPE_OPTIONS}
            />
            <Input
              label="Registration Number"
              required
              value={form.registrationNumber}
              onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })}
            />
            <Input
              label="Capacity"
              type="number"
              min="1"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
            />
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              options={VEHICLE_STATUS_OPTIONS}
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        title="Delete vehicle"
        message={`Delete vehicle "${pendingDelete?.registrationNumber}"?`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

export default VehicleList;
