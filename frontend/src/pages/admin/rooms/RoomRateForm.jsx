import { useEffect, useState } from 'react';
import { Button, Input, Modal, Select } from '../../../components/ui/index.js';

const EMPTY = {
  roomTypeId: '',
  ratePlanId: '',
  startDate: '',
  endDate: '',
  price: '',
  extraAdultPrice: 0,
  extraChildPrice: 0,
  currency: 'USD',
};

/**
 * Modal form for creating/editing a single dated RoomRate row (price for a
 * room type + rate plan over a date range). Used from RatePlanList.jsx.
 */
export function RoomRateForm({ isOpen, onClose, onSubmit, saving, roomTypes, ratePlans, initialValues }) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (isOpen) setForm({ ...EMPTY, ...initialValues });
  }, [isOpen, initialValues]);

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({
      ...form,
      price: Number(form.price),
      extraAdultPrice: Number(form.extraAdultPrice || 0),
      extraChildPrice: Number(form.extraChildPrice || 0),
    });
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialValues?.id ? 'Edit Room Rate' : 'Add Room Rate'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={saving}>
            Save
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <Select
            label="Room Type"
            required
            value={form.roomTypeId}
            onChange={(e) => setField('roomTypeId', e.target.value)}
            placeholder="Select room type"
            options={roomTypes.map((rt) => ({ value: rt.id, label: rt.name }))}
          />
          <Select
            label="Rate Plan"
            required
            value={form.ratePlanId}
            onChange={(e) => setField('ratePlanId', e.target.value)}
            placeholder="Select rate plan"
            options={ratePlans.map((rp) => ({ value: rp.id, label: rp.name }))}
          />
          <Input label="Start Date" type="date" required value={form.startDate} onChange={(e) => setField('startDate', e.target.value)} />
          <Input label="End Date" type="date" required value={form.endDate} onChange={(e) => setField('endDate', e.target.value)} />
          <Input label="Price" type="number" step="0.01" required value={form.price} onChange={(e) => setField('price', e.target.value)} />
          <Input label="Currency" value={form.currency} onChange={(e) => setField('currency', e.target.value)} />
          <Input
            label="Extra Adult Price"
            type="number"
            step="0.01"
            value={form.extraAdultPrice}
            onChange={(e) => setField('extraAdultPrice', e.target.value)}
          />
          <Input
            label="Extra Child Price"
            type="number"
            step="0.01"
            value={form.extraChildPrice}
            onChange={(e) => setField('extraChildPrice', e.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
}

export default RoomRateForm;
