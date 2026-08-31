'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button, Card, Input, Loader, SectionTabs, Select, Textarea, useToast } from '../../../components/ui/index.js';
import * as roomTypeService from '../../../services/roomTypeService.js';
import * as hotelService from '../../../services/hotelService.js';
import * as amenityService from '../../../services/amenityService.js';
import { ROOM_TYPE_NAME_OPTIONS } from '../../../constants/options.js';
import { ROOM_SECTION_TABS } from './roomsNav.js';
import { apiFieldErrors, toastFromApiError, toastFromFieldErrors } from '../../../utils/formErrors.js';

const EMPTY_FORM = {
  hotelId: '',
  name: '',
  description: '',
  maxAdults: 2,
  maxChildren: 0,
  bedType: '',
  roomSize: '',
  smoking: false,
  totalRooms: 0,
};

/** Create/Edit form for a room type, shared between the two flows. */
export function RoomTypeForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const router = useRouter();
  const { show } = useToast();

  const [form, setForm] = useState(EMPTY_FORM);
  const [hotels, setHotels] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [selectedAmenityIds, setSelectedAmenityIds] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    hotelService.list({ limit: 100 }).then((res) => setHotels(res.data || []));
    amenityService.list({ limit: 100 }).then((res) => setAmenities(res.data || []));
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    roomTypeService
      .getById(id)
      .then((res) => {
        const rt = res.data;
        setForm({ ...EMPTY_FORM, ...rt, roomSize: rt.roomSize ?? '' });
        setSelectedAmenityIds((rt.amenities || []).map((a) => a.amenityId || a.amenity?.id));
      })
      .catch((err) => show(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [id, isEdit, show]);

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleAmenity(amenityId) {
    setSelectedAmenityIds((prev) =>
      prev.includes(amenityId) ? prev.filter((a) => a !== amenityId) : [...prev, amenityId]
    );
  }

  function validate() {
    const next = {};
    if (!form.hotelId) next.hotelId = 'Hotel is required.';
    if (!form.name.trim()) next.name = 'Name is required.';
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
    const payload = {
      ...form,
      maxAdults: Number(form.maxAdults),
      maxChildren: Number(form.maxChildren),
      totalRooms: Number(form.totalRooms),
      roomSize: form.roomSize === '' ? null : Number(form.roomSize),
    };
    try {
      let roomTypeId = id;
      if (isEdit) {
        await roomTypeService.update(id, payload);
      } else {
        const res = await roomTypeService.create(payload);
        roomTypeId = res.data.id;
      }
      await roomTypeService.setAmenities(roomTypeId, selectedAmenityIds).catch(() => null);
      show(isEdit ? 'Room type updated' : 'Room type created', 'success');
      router.push('/admin/rooms/room-types');
    } catch (err) {
      setErrors((prev) => ({ ...prev, ...apiFieldErrors(err) }));
      show(toastFromApiError(err), 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loader label="Loading room type..." />;

  return (
    <div>
      <SectionTabs tabs={ROOM_SECTION_TABS} />

      <div className="page-header">
        <h1 className="page-title">{isEdit ? 'Edit Room Type' : 'New Room Type'}</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <div className="form-grid">
            <Select
              label="Hotel"
              required
              value={form.hotelId}
              error={errors.hotelId}
              onChange={(e) => setField('hotelId', e.target.value)}
              placeholder="Select a hotel"
              options={hotels.map((h) => ({ value: h.id, label: h.name }))}
            />
            <Input
              label="Name"
              required
              list="room-type-names"
              value={form.name}
              error={errors.name}
              onChange={(e) => setField('name', e.target.value)}
            />
            <datalist id="room-type-names">
              {ROOM_TYPE_NAME_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} />
              ))}
            </datalist>
            <Input label="Bed Type" value={form.bedType} onChange={(e) => setField('bedType', e.target.value)} />
            <Input
              label="Max Adults"
              type="number"
              min="1"
              value={form.maxAdults}
              onChange={(e) => setField('maxAdults', e.target.value)}
            />
            <Input
              label="Max Children"
              type="number"
              min="0"
              value={form.maxChildren}
              onChange={(e) => setField('maxChildren', e.target.value)}
            />
            <Input
              label="Room Size (sq m)"
              type="number"
              step="any"
              value={form.roomSize}
              onChange={(e) => setField('roomSize', e.target.value)}
            />
            <Input
              label="Total Rooms"
              type="number"
              min="0"
              value={form.totalRooms}
              onChange={(e) => setField('totalRooms', e.target.value)}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
              <input type="checkbox" checked={form.smoking} onChange={(e) => setField('smoking', e.target.checked)} />
              Smoking allowed
            </label>
          </div>

          <Textarea label="Description" value={form.description} onChange={(e) => setField('description', e.target.value)} />

          <div className="form-section">
            <h3 className="form-section__title">Amenities</h3>
            <div className="form-grid">
              {amenities.map((amenity) => (
                <label key={amenity.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <input
                    type="checkbox"
                    checked={selectedAmenityIds.includes(amenity.id)}
                    onChange={() => toggleAmenity(amenity.id)}
                  />
                  {amenity.name}
                </label>
              ))}
              {amenities.length === 0 && <p className="text-muted">No amenities defined yet.</p>}
            </div>
          </div>

          <div className="form-actions">
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {isEdit ? 'Save Changes' : 'Create Room Type'}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}

export default RoomTypeForm;
