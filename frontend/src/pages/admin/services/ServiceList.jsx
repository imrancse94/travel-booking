import { useState } from 'react';
import {
  Button,
  Card,
  ConfirmDialog,
  Input,
  Modal,
  Pagination,
  SearchFilterBar,
  Select,
  StatusBadge,
  Table,
  Textarea,
  useToast,
} from '../../../components/ui/index.js';
import { useResourceList } from '../../../hooks/useResourceList.js';
import { usePermission } from '../../../hooks/usePermission.js';
import * as serviceService from '../../../services/serviceService.js';
import { ENTITY_STATUS_OPTIONS } from '../../../constants/options.js';
import { formatCurrency } from '../../../utils/format.js';

const EMPTY_SERVICE = { name: '', description: '', price: '', tax: '0', status: 'active' };

function toFormValues(service) {
  return {
    name: service.name || '',
    description: service.description || '',
    price: String(service.price ?? ''),
    tax: String(service.tax ?? '0'),
    status: service.status || 'active',
  };
}

/**
 * Extra-services catalog (instructions.md section 20): airport pickup, extra
 * bed, laundry and so on. These rows are what the customer checkout's
 * "Additional Services" step offers, and what booking_services references,
 * so prices are edited here rather than hard-coded anywhere.
 */
export function ServiceList() {
  const { show } = useToast();
  const canCreate = usePermission('services.create');
  const canUpdate = usePermission('services.update');
  const canDelete = usePermission('services.delete');

  const list = useResourceList({ fetcher: serviceService.list, initialFilters: { status: '' } });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_SERVICE);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_SERVICE);
    setErrors({});
    setModalOpen(true);
  }

  function openEdit(service) {
    setEditing(service);
    setForm(toFormValues(service));
    setErrors({});
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  function validate() {
    const next = {};
    if (!form.name.trim()) next.name = 'Required';
    if (form.price === '' || Number.isNaN(Number(form.price)) || Number(form.price) < 0) {
      next.price = 'Enter a price of 0 or more';
    }
    if (form.tax !== '' && (Number.isNaN(Number(form.tax)) || Number(form.tax) < 0)) {
      next.tax = 'Enter a tax of 0 or more';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSave(e) {
    e?.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      // The API takes numbers for money fields; the form holds strings.
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        price: Number(form.price),
        tax: Number(form.tax || 0),
        status: form.status,
      };
      if (editing) {
        await serviceService.update(editing.id, payload);
        show('Service updated', 'success');
      } else {
        await serviceService.create(payload);
        show('Service created', 'success');
      }
      closeModal();
      list.reload();
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await serviceService.remove(pendingDelete.id);
      show('Service deleted', 'success');
      setPendingDelete(null);
      list.reload();
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setDeleting(false);
    }
  }

  const columns = [
    { key: 'name', header: 'Service' },
    { key: 'description', header: 'Description', render: (row) => row.description || '—' },
    { key: 'price', header: 'Price', render: (row) => formatCurrency(row.price) },
    { key: 'tax', header: 'Tax', render: (row) => formatCurrency(row.tax) },
    {
      key: 'total',
      header: 'Guest Pays',
      render: (row) => formatCurrency(Number(row.price ?? 0) + Number(row.tax ?? 0)),
    },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    ...(canUpdate || canDelete
      ? [
          {
            key: 'actions',
            header: '',
            render: (row) => (
              <div className="inline-actions">
                {canUpdate && (
                  <Button variant="ghost" onClick={() => openEdit(row)}>
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
        ]
      : []),
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Extra Services</h1>
          <p className="page-subtitle">
            Add-ons offered during checkout and chargeable on a booking — airport transfers, breakfast, extra beds and
            more.
          </p>
        </div>
        <div className="page-actions">{canCreate && <Button onClick={openCreate}>+ New Service</Button>}</div>
      </div>

      <Card>
        <SearchFilterBar search={list.search} onSearchChange={list.setSearch} searchPlaceholder="Search services...">
          <Select
            value={list.filters.status}
            onChange={(e) => list.setFilters({ ...list.filters, status: e.target.value })}
            placeholder="All statuses"
            options={ENTITY_STATUS_OPTIONS}
          />
        </SearchFilterBar>

        <Table columns={columns} rows={list.rows} loading={list.loading} emptyMessage="No services found." />

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
        onClose={closeModal}
        title={editing ? `Edit ${editing.name}` : 'New Service'}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              Save
            </Button>
          </>
        }
      >
        <form onSubmit={handleSave}>
          <Input
            label="Name"
            required
            value={form.name}
            error={errors.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Textarea
            label="Description"
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="form-grid">
            <Input
              label="Price"
              type="number"
              min="0"
              step="0.01"
              required
              value={form.price}
              error={errors.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
            <Input
              label="Tax"
              type="number"
              min="0"
              step="0.01"
              value={form.tax}
              error={errors.tax}
              onChange={(e) => setForm({ ...form, tax: e.target.value })}
            />
          </div>
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            options={ENTITY_STATUS_OPTIONS}
          />
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        title="Delete service"
        message={`Delete "${pendingDelete?.name}"? Bookings that already include it keep their charge.`}
        loading={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

export default ServiceList;
