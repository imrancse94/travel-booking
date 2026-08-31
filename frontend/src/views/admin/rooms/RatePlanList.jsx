'use client';

import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  ConfirmDialog,
  Input,
  Modal,
  SectionTabs,
  Select,
  Table,
  useToast,
} from '../../../components/ui/index.js';
import { usePermission } from '../../../hooks/usePermission.js';
import * as ratePlanService from '../../../services/ratePlanService.js';
import * as roomTypeService from '../../../services/roomTypeService.js';
import { RATE_PLAN_TYPE_OPTIONS } from '../../../constants/options.js';
import { formatCurrency, formatDate } from '../../../utils/format.js';
import { ROOM_SECTION_TABS } from './roomsNav.js';
import { RoomRateForm } from './RoomRateForm.jsx';

const EMPTY_PLAN = { name: '', type: 'room_only', description: '' };

/** Rate plans (Room Only / Breakfast Included / ...) and their dated room-rate rows, grouped in one page. */
export function RatePlanList() {
  const { show } = useToast();
  // Both hooks must run on every render: `||` short-circuits, so the second
  // usePermission was skipped whenever the first returned true, changing the
  // hook call order between renders.
  const canCreateRatePlans = usePermission('rate_plans.create');
  const canUpdateRatePlans = usePermission('rate_plans.update');
  const canManage = canCreateRatePlans || canUpdateRatePlans;

  const [ratePlans, setRatePlans] = useState([]);
  const [roomRates, setRoomRates] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roomTypeFilter, setRoomTypeFilter] = useState('');

  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [planForm, setPlanForm] = useState(EMPTY_PLAN);
  const [savingPlan, setSavingPlan] = useState(false);

  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [editingRate, setEditingRate] = useState(null);
  const [savingRate, setSavingRate] = useState(false);
  const [pendingDeleteRate, setPendingDeleteRate] = useState(null);

  function loadAll() {
    setLoading(true);
    return Promise.all([
      ratePlanService.list({ limit: 100 }),
      roomTypeService.list({ limit: 200 }),
      ratePlanService.listRoomRates(roomTypeFilter ? { roomTypeId: roomTypeFilter, limit: 100 } : { limit: 100 }),
    ])
      .then(([plansRes, roomTypesRes, ratesRes]) => {
        setRatePlans(plansRes.data || []);
        setRoomTypes(roomTypesRes.data || []);
        setRoomRates(ratesRes.data || []);
      })
      .catch((err) => show(err.message, 'error'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomTypeFilter]);

  async function handleSavePlan(e) {
    e.preventDefault();
    setSavingPlan(true);
    try {
      await ratePlanService.create(planForm);
      show('Rate plan created', 'success');
      setPlanModalOpen(false);
      setPlanForm(EMPTY_PLAN);
      loadAll();
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setSavingPlan(false);
    }
  }

  async function handleDeletePlan(plan) {
    try {
      await ratePlanService.remove(plan.id);
      show('Rate plan deleted', 'success');
      loadAll();
    } catch (err) {
      show(err.message, 'error');
    }
  }

  async function handleSaveRate(payload) {
    setSavingRate(true);
    try {
      if (editingRate?.id) {
        await ratePlanService.updateRoomRate(editingRate.id, payload);
      } else {
        await ratePlanService.createRoomRate(payload);
      }
      show('Room rate saved', 'success');
      setRateModalOpen(false);
      setEditingRate(null);
      loadAll();
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setSavingRate(false);
    }
  }

  async function handleDeleteRate() {
    try {
      await ratePlanService.removeRoomRate(pendingDeleteRate.id);
      show('Room rate deleted', 'success');
      setPendingDeleteRate(null);
      loadAll();
    } catch (err) {
      show(err.message, 'error');
    }
  }

  const planColumns = [
    { key: 'name', header: 'Name' },
    { key: 'type', header: 'Type', render: (p) => RATE_PLAN_TYPE_OPTIONS.find((o) => o.value === p.type)?.label || p.type },
    { key: 'description', header: 'Description', render: (p) => p.description || '—' },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: '',
            render: (p) => (
              <Button variant="ghost" onClick={() => handleDeletePlan(p)}>
                Delete
              </Button>
            ),
          },
        ]
      : []),
  ];

  const rateColumns = [
    { key: 'roomType', header: 'Room Type', render: (r) => r.roomType?.name || '—' },
    { key: 'ratePlan', header: 'Rate Plan', render: (r) => r.ratePlan?.name || '—' },
    { key: 'startDate', header: 'From', render: (r) => formatDate(r.startDate) },
    { key: 'endDate', header: 'To', render: (r) => formatDate(r.endDate) },
    { key: 'price', header: 'Price', render: (r) => formatCurrency(r.price, r.currency) },
    { key: 'extraAdultPrice', header: 'Extra Adult', render: (r) => formatCurrency(r.extraAdultPrice, r.currency) },
    { key: 'extraChildPrice', header: 'Extra Child', render: (r) => formatCurrency(r.extraChildPrice, r.currency) },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: '',
            render: (r) => (
              <div className="inline-actions">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setEditingRate(r);
                    setRateModalOpen(true);
                  }}
                >
                  Edit
                </Button>
                <Button variant="ghost" onClick={() => setPendingDeleteRate(r)}>
                  Delete
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      <SectionTabs tabs={ROOM_SECTION_TABS} />

      <div className="page-header">
        <div>
          <h1 className="page-title">Rate Plans</h1>
          <p className="page-subtitle">Room Only, Breakfast Included and other rate plans, plus dated room rates.</p>
        </div>
        <div className="page-actions">
          {canManage && <Button onClick={() => setPlanModalOpen(true)}>+ New Rate Plan</Button>}
        </div>
      </div>

      <Card title="Rate Plans">
        <Table columns={planColumns} rows={ratePlans} loading={loading} emptyMessage="No rate plans yet." />
      </Card>

      <Card title="Room Rates" style={{ marginTop: 'var(--space-5)' }}>
        <div className="table-toolbar">
          <Select
            value={roomTypeFilter}
            onChange={(e) => setRoomTypeFilter(e.target.value)}
            placeholder="All room types"
            options={roomTypes.map((rt) => ({ value: rt.id, label: rt.name }))}
          />
          {canManage && (
            <Button
              onClick={() => {
                setEditingRate(null);
                setRateModalOpen(true);
              }}
            >
              + Add Rate
            </Button>
          )}
        </div>
        <Table columns={rateColumns} rows={roomRates} loading={loading} emptyMessage="No room rates configured." />
      </Card>

      <Modal
        isOpen={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        title="New Rate Plan"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPlanModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePlan} loading={savingPlan}>
              Save
            </Button>
          </>
        }
      >
        <form onSubmit={handleSavePlan}>
          <Input label="Name" required value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} />
          <Select
            label="Type"
            value={planForm.type}
            onChange={(e) => setPlanForm({ ...planForm, type: e.target.value })}
            options={RATE_PLAN_TYPE_OPTIONS}
          />
          <Input
            label="Description"
            value={planForm.description}
            onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
          />
        </form>
      </Modal>

      <RoomRateForm
        isOpen={rateModalOpen}
        onClose={() => {
          setRateModalOpen(false);
          setEditingRate(null);
        }}
        onSubmit={handleSaveRate}
        saving={savingRate}
        roomTypes={roomTypes}
        ratePlans={ratePlans}
        initialValues={editingRate}
      />

      <ConfirmDialog
        isOpen={Boolean(pendingDeleteRate)}
        title="Delete room rate"
        message="Delete this room rate row?"
        onCancel={() => setPendingDeleteRate(null)}
        onConfirm={handleDeleteRate}
      />
    </div>
  );
}

export default RatePlanList;
