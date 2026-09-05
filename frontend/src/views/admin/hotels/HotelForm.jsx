'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeftIcon, Button, Card, Input, Select, Textarea, Loader, useToast } from '../../../components/ui/index.js';
import * as hotelService from '../../../services/hotelService.js';
import * as amenityService from '../../../services/amenityService.js';
import { HOTEL_STATUS_OPTIONS } from '../../../constants/options.js';
import { apiFieldErrors, toastFromApiError, toastFromFieldErrors } from '../../../utils/formErrors.js';

const EMPTY_FORM = {
  name: '',
  description: '',
  address: '',
  city: '',
  state: '',
  country: '',
  postalCode: '',
  latitude: '',
  longitude: '',
  starRating: '',
  email: '',
  phone: '',
  checkInTime: '14:00',
  checkOutTime: '12:00',
  status: 'active',
  cancellationPolicy: '',
  paymentPolicy: '',
  childPolicy: '',
  petPolicy: '',
};

/** Create/Edit form for a hotel, shared between the two flows. Also manages hotel-level amenity selection. */
export function HotelForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const router = useRouter();
  const { show } = useToast();

  const [form, setForm] = useState(EMPTY_FORM);
  const [amenities, setAmenities] = useState([]);
  const [selectedAmenityIds, setSelectedAmenityIds] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    amenityService
      .list({ limit: 100 })
      .then((res) => setAmenities(res.data || []))
      .catch(() => setAmenities([]));
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    hotelService
      .getById(id)
      .then((res) => {
        const hotel = res.data;
        setForm({
          ...EMPTY_FORM,
          ...hotel,
          starRating: hotel.starRating ?? '',
          latitude: hotel.latitude ?? '',
          longitude: hotel.longitude ?? '',
        });
        setSelectedAmenityIds((hotel.hotelAmenities || []).map((ha) => ha.amenityId || ha.amenity?.id));
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
    if (!form.name.trim()) next.name = 'Hotel name is required.';
    if (form.starRating && (form.starRating < 1 || form.starRating > 5)) next.starRating = 'Rating must be 1-5.';
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
      starRating: form.starRating === '' ? null : Number(form.starRating),
      latitude: form.latitude === '' ? null : Number(form.latitude),
      longitude: form.longitude === '' ? null : Number(form.longitude),
    };

    try {
      let hotelId = id;
      if (isEdit) {
        await hotelService.update(id, payload);
      } else {
        const res = await hotelService.create(payload);
        hotelId = res.data.id;
      }
      await hotelService.setAmenities(hotelId, selectedAmenityIds).catch(() => null);
      show(isEdit ? 'Hotel updated' : 'Hotel created', 'success');
      router.push(`/admin/hotels/${hotelId}`);
    } catch (err) {
      setErrors((prev) => ({ ...prev, ...apiFieldErrors(err) }));
      show(toastFromApiError(err), 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loader label="Loading hotel..." />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{isEdit ? 'Edit Hotel' : 'New Hotel'}</h1>
        </div>
        <div className="page-actions">
          <Button icon={<ArrowLeftIcon />} variant="primary" onClick={() => router.push('/admin/hotels')}>
            Back
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <div className="form-section">
            <h3 className="form-section__title">Basic Information</h3>
            <div className="form-grid">
              <Input
                label="Hotel Name"
                required
                value={form.name}
                error={errors.name}
                onChange={(e) => setField('name', e.target.value)}
              />
              <Select
                label="Status"
                value={form.status}
                onChange={(e) => setField('status', e.target.value)}
                options={HOTEL_STATUS_OPTIONS}
              />
              <Input
                label="Star Rating"
                type="number"
                min="1"
                max="5"
                value={form.starRating}
                error={errors.starRating}
                onChange={(e) => setField('starRating', e.target.value)}
              />
              <Input label="Email" type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} />
              <Input label="Phone" value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
            </div>
            <Textarea
              label="Description"
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
            />
          </div>

          <div className="form-section">
            <h3 className="form-section__title">Location</h3>
            <div className="form-grid">
              <Input
                label="Address"
                containerClassName="form-grid--full-item"
                value={form.address}
                onChange={(e) => setField('address', e.target.value)}
              />
              <Input label="City" value={form.city} onChange={(e) => setField('city', e.target.value)} />
              <Input label="State / Province" value={form.state} onChange={(e) => setField('state', e.target.value)} />
              <Input label="Country" value={form.country} onChange={(e) => setField('country', e.target.value)} />
              <Input label="Postal Code" value={form.postalCode} onChange={(e) => setField('postalCode', e.target.value)} />
              <Input label="Latitude" type="number" step="any" value={form.latitude} onChange={(e) => setField('latitude', e.target.value)} />
              <Input label="Longitude" type="number" step="any" value={form.longitude} onChange={(e) => setField('longitude', e.target.value)} />
            </div>
          </div>

          <div className="form-section">
            <h3 className="form-section__title">Check-in / Check-out</h3>
            <div className="form-grid">
              <Input label="Check-in Time" type="time" value={form.checkInTime} onChange={(e) => setField('checkInTime', e.target.value)} />
              <Input label="Check-out Time" type="time" value={form.checkOutTime} onChange={(e) => setField('checkOutTime', e.target.value)} />
            </div>
          </div>

          <div className="form-section">
            <h3 className="form-section__title">Policies</h3>
            <Textarea label="Cancellation Policy" value={form.cancellationPolicy} onChange={(e) => setField('cancellationPolicy', e.target.value)} />
            <Textarea label="Payment Policy" value={form.paymentPolicy} onChange={(e) => setField('paymentPolicy', e.target.value)} />
            <Textarea label="Child Policy" value={form.childPolicy} onChange={(e) => setField('childPolicy', e.target.value)} />
            <Textarea label="Pet Policy" value={form.petPolicy} onChange={(e) => setField('petPolicy', e.target.value)} />
          </div>

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
              {isEdit ? 'Save Changes' : 'Create Hotel'}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}

export default HotelForm;
