'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeftIcon, Button, Card, Input, Loader, SectionTabs, Select, useToast } from '../../../components/ui/index.js';
import * as roomService from '../../../services/roomService.js';
import * as roomTypeService from '../../../services/roomTypeService.js';
import { ROOM_STATUS_OPTIONS } from '../../../constants/options.js';
import { ROOM_SECTION_TABS } from './roomsNav.js';
import { apiFieldErrors, toastFromApiError, toastFromFieldErrors } from '../../../utils/formErrors.js';
import { MAX_PAGE_SIZE } from '../../../constants/pagination.js';

const EMPTY_FORM = { roomTypeId: '', roomNumber: '', floor: '', status: 'available' };

/** Create/Edit form for an individual room. */
export function RoomForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const router = useRouter();
  const { show } = useToast();

  const [form, setForm] = useState(EMPTY_FORM);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    roomTypeService
      .list({ limit: MAX_PAGE_SIZE })
      .then((res) => setRoomTypes(res.data || []))
      .catch(() => setRoomTypes([]));
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    roomService
      .getById(id)
      .then((res) => setForm({ ...EMPTY_FORM, ...res.data }))
      .catch((err) => show(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [id, isEdit, show]);

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validate() {
    const next = {};
    if (!form.roomTypeId) next.roomTypeId = 'Room type is required.';
    if (!form.roomNumber.trim()) next.roomNumber = 'Room number is required.';
    setErrors(next);
    return next;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const invalid = validate();
    if (Object.keys(invalid).length > 0) {
      // Returning silently here left the submit button looking inert whenever
      // the offending field was scrolled out of view.
      show(toastFromFieldErrors(invalid), 'error');
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await roomService.update(id, form);
      } else {
        await roomService.create(form);
      }
      show(isEdit ? 'Room updated' : 'Room created', 'success');
      router.push('/admin/rooms/rooms');
    } catch (err) {
      setErrors((prev) => ({ ...prev, ...apiFieldErrors(err) }));
      show(toastFromApiError(err), 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loader label="Loading room..." />;

  return (
    <div>
      <SectionTabs tabs={ROOM_SECTION_TABS} />

      <div className="page-header">
        <h1 className="page-title">{isEdit ? 'Edit Room' : 'New Room'}</h1>
        <div className="page-actions">
          <Button icon={<ArrowLeftIcon />} variant="primary" onClick={() => router.push('/admin/rooms/rooms')}>
            Back
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <div className="form-grid">
            <Select
              label="Room Type"
              required
              value={form.roomTypeId}
              error={errors.roomTypeId}
              onChange={(e) => setField('roomTypeId', e.target.value)}
              placeholder="Select a room type"
              options={roomTypes.map((rt) => ({ value: rt.id, label: `${rt.hotel?.name ? rt.hotel.name + ' - ' : ''}${rt.name}` }))}
            />
            <Input
              label="Room Number"
              required
              value={form.roomNumber}
              error={errors.roomNumber}
              onChange={(e) => setField('roomNumber', e.target.value)}
            />
            <Input label="Floor" value={form.floor} onChange={(e) => setField('floor', e.target.value)} />
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => setField('status', e.target.value)}
              options={ROOM_STATUS_OPTIONS}
            />
          </div>

          <div className="form-actions">
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {isEdit ? 'Save Changes' : 'Create Room'}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}

export default RoomForm;
