'use client';

import { useEffect, useState } from 'react';
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
import { ENTITY_STATUS_OPTIONS } from '../../../constants/options.js';
import { TRANSPORT_SECTION_TABS } from './transportNav.js';

const EMPTY_FORM = { name: '', phone: '', licenseNumber: '', vehicleId: '', status: 'active' };

/** Drivers list with an inline create/edit modal, including optional vehicle assignment. */
export function DriverList() {
  const { show } = useToast();
  const canCreate = usePermission('transport.create');
  const canUpdate = usePermission('transport.update');
  const canDelete = usePermission('transport.delete');

  const [vehicles, setVehicles] = useState([]);
  const list = useResourceList({ fetcher: transportService.listDrivers });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => {
    transportService
      .listVehicles({ limit: 200 })
      .then((res) => setVehicles(res.data || []))
      .catch(() => setVehicles([]));
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(driver) {
    setEditing(driver);
    setForm({
      name: driver.name,
      phone: driver.phone || '',
      licenseNumber: driver.licenseNumber || '',
      vehicleId: driver.vehicleId || '',
      status: driver.status,
    });
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, vehicleId: form.vehicleId || null };
    try {
      if (editing) {
        await transportService.updateDriver(editing.id, payload);
      } else {
        await transportService.createDriver(payload);
      }
      show(editing ? 'Driver updated' : 'Driver created', 'success');
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
      await transportService.removeDriver(pendingDelete.id);
      show('Driver deleted', 'success');
      setPendingDelete(null);
      list.reload();
    } catch (err) {
      show(err.message, 'error');
    }
  }

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'phone', header: 'Phone', render: (d) => d.phone || '—' },
    { key: 'licenseNumber', header: 'License #', render: (d) => d.licenseNumber || '—' },
    { key: 'vehicle', header: 'Vehicle', render: (d) => d.vehicle?.registrationNumber || '—' },
    { key: 'status', header: 'Status', render: (d) => <StatusBadge status={d.status} /> },
    {
      key: 'actions',
      header: '',
      render: (d) => (
        <div className="inline-actions">
          {canUpdate && (
            <Button variant="ghost" onClick={() => openEdit(d)}>
              Edit
            </Button>
          )}
          {canDelete && (
            <Button variant="ghost" onClick={() => setPendingDelete(d)}>
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
          <h1 className="page-title">Drivers</h1>
          <p className="page-subtitle">Drivers assigned to fleet vehicles.</p>
        </div>
        <div className="page-actions">{canCreate && <Button onClick={openCreate}>+ New Driver</Button>}</div>
      </div>

      <Card>
        <SearchFilterBar search={list.search} onSearchChange={list.setSearch} searchPlaceholder="Search by name or phone..." />

        <Table columns={columns} rows={list.rows} loading={list.loading} emptyMessage="No drivers found." />

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
        title={editing ? 'Edit Driver' : 'New Driver'}
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
            <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input
              label="License Number"
              value={form.licenseNumber}
              onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
            />
            <Select
              label="Vehicle"
              value={form.vehicleId}
              onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
              placeholder="Unassigned"
              options={vehicles.map((v) => ({ value: v.id, label: v.registrationNumber }))}
            />
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              options={ENTITY_STATUS_OPTIONS}
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        title="Delete driver"
        message={`Delete "${pendingDelete?.name}"?`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

export default DriverList;
