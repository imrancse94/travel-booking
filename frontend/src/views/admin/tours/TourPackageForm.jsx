'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Button,
  Card,
  Input,
  Loader,
  SectionTabs,
  Select,
  Textarea,
  useToast,
} from '../../../components/ui/index.js';
import * as tourService from '../../../services/tourService.js';
import * as destinationService from '../../../services/destinationService.js';
import { ENTITY_STATUS_OPTIONS } from '../../../constants/options.js';
import { TOUR_SECTION_TABS } from './toursNav.js';
import { apiFieldErrors, toastFromApiError, toastFromFieldErrors } from '../../../utils/formErrors.js';

const EMPTY_FORM = {
  destinationId: '',
  name: '',
  description: '',
  durationDays: 1,
  price: '',
  currency: 'USD',
  maxParticipants: 10,
  includedServices: '',
  excludedServices: '',
  status: 'active',
};

function emptyDay(dayNumber) {
  return { dayNumber, title: '', description: '', activities: '', meals: '', accommodation: '', transportation: '' };
}

/** Create/Edit form for a tour package, including a day-by-day itinerary editor. */
export function TourPackageForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const router = useRouter();
  const { show } = useToast();

  const [form, setForm] = useState(EMPTY_FORM);
  const [destinations, setDestinations] = useState([]);
  const [days, setDays] = useState([emptyDay(1)]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    destinationService.list({ limit: 100 }).then((res) => setDestinations(res.data || []));
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    Promise.all([tourService.getPackage(id), tourService.listItineraries(id).catch(() => ({ data: [] }))])
      .then(([pkgRes, itineraryRes]) => {
        setForm({ ...EMPTY_FORM, ...pkgRes.data });
        const loadedDays = itineraryRes.data || [];
        setDays(loadedDays.length ? loadedDays : [emptyDay(1)]);
      })
      .catch((err) => show(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [id, isEdit, show]);

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updateDay(index, key, value) {
    setDays((prev) => prev.map((d, i) => (i === index ? { ...d, [key]: value } : d)));
  }

  function addDay() {
    setDays((prev) => [...prev, emptyDay(prev.length + 1)]);
  }

  function removeDay(index) {
    setDays((prev) => prev.filter((_, i) => i !== index).map((d, i) => ({ ...d, dayNumber: i + 1 })));
  }

  function validate() {
    const next = {};
    if (!form.destinationId) next.destinationId = 'Destination is required.';
    if (!form.name.trim()) next.name = 'Name is required.';
    if (!form.price) next.price = 'Price is required.';
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
      durationDays: Number(form.durationDays),
      price: Number(form.price),
      maxParticipants: Number(form.maxParticipants),
    };
    try {
      let packageId = id;
      if (isEdit) {
        await tourService.updatePackage(id, payload);
      } else {
        const res = await tourService.createPackage(payload);
        packageId = res.data.id;
      }
      await tourService.saveItineraries(packageId, days).catch(() => null);
      show(isEdit ? 'Tour package updated' : 'Tour package created', 'success');
      router.push('/admin/tours/packages');
    } catch (err) {
      setErrors((prev) => ({ ...prev, ...apiFieldErrors(err) }));
      show(toastFromApiError(err), 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loader label="Loading tour package..." />;

  return (
    <div>
      <SectionTabs tabs={TOUR_SECTION_TABS} />

      <div className="page-header">
        <h1 className="page-title">{isEdit ? 'Edit Tour Package' : 'New Tour Package'}</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <div className="form-section">
            <h3 className="form-section__title">Details</h3>
            <div className="form-grid">
              <Input label="Name" required value={form.name} error={errors.name} onChange={(e) => setField('name', e.target.value)} />
              <Select
                label="Destination"
                required
                value={form.destinationId}
                error={errors.destinationId}
                onChange={(e) => setField('destinationId', e.target.value)}
                placeholder="Select a destination"
                options={destinations.map((d) => ({ value: d.id, label: d.name }))}
              />
              <Input
                label="Duration (days)"
                type="number"
                min="1"
                value={form.durationDays}
                onChange={(e) => setField('durationDays', e.target.value)}
              />
              <Input label="Price" type="number" step="0.01" required value={form.price} error={errors.price} onChange={(e) => setField('price', e.target.value)} />
              <Input label="Currency" value={form.currency} onChange={(e) => setField('currency', e.target.value)} />
              <Input
                label="Max Participants"
                type="number"
                min="1"
                value={form.maxParticipants}
                onChange={(e) => setField('maxParticipants', e.target.value)}
              />
              <Select
                label="Status"
                value={form.status}
                onChange={(e) => setField('status', e.target.value)}
                options={ENTITY_STATUS_OPTIONS}
              />
            </div>
            <Textarea label="Description" value={form.description} onChange={(e) => setField('description', e.target.value)} />
            <Textarea
              label="Included Services"
              value={form.includedServices}
              onChange={(e) => setField('includedServices', e.target.value)}
            />
            <Textarea
              label="Excluded Services"
              value={form.excludedServices}
              onChange={(e) => setField('excludedServices', e.target.value)}
            />
          </div>

          <div className="form-section">
            <h3 className="form-section__title">Itinerary</h3>
            <div className="day-editor">
              {days.map((day, index) => (
                <div key={index} className="day-editor__card">
                  {days.length > 1 && (
                    <Button variant="danger" className="day-editor__remove" onClick={() => removeDay(index)}>
                      Remove
                    </Button>
                  )}
                  <h4 className="mt-0">Day {day.dayNumber}</h4>
                  <div className="form-grid">
                    <Input label="Title" value={day.title} onChange={(e) => updateDay(index, 'title', e.target.value)} />
                    <Input label="Meals" value={day.meals} onChange={(e) => updateDay(index, 'meals', e.target.value)} />
                    <Input
                      label="Accommodation"
                      value={day.accommodation}
                      onChange={(e) => updateDay(index, 'accommodation', e.target.value)}
                    />
                    <Input
                      label="Transportation"
                      value={day.transportation}
                      onChange={(e) => updateDay(index, 'transportation', e.target.value)}
                    />
                  </div>
                  <Textarea label="Description" value={day.description} onChange={(e) => updateDay(index, 'description', e.target.value)} />
                  <Textarea label="Activities" value={day.activities} onChange={(e) => updateDay(index, 'activities', e.target.value)} />
                </div>
              ))}
              <Button type="button" variant="secondary" onClick={addDay}>
                + Add Day
              </Button>
            </div>
          </div>

          <div className="form-actions">
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {isEdit ? 'Save Changes' : 'Create Package'}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}

export default TourPackageForm;
