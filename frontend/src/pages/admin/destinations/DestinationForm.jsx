import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Input, Loader, Select, Textarea, useToast } from '../../../components/ui/index.js';
import * as destinationService from '../../../services/destinationService.js';
import { ENTITY_STATUS_OPTIONS } from '../../../constants/options.js';

const EMPTY_FORM = { name: '', country: '', description: '', imageUrl: '', status: 'active' };

/** Create/Edit form for a destination. */
export function DestinationForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { show } = useToast();

  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    destinationService
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
    if (!form.name.trim()) next.name = 'Name is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      if (isEdit) {
        await destinationService.update(id, form);
      } else {
        await destinationService.create(form);
      }
      show(isEdit ? 'Destination updated' : 'Destination created', 'success');
      navigate('/admin/destinations');
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loader label="Loading destination..." />;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{isEdit ? 'Edit Destination' : 'New Destination'}</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <div className="form-grid">
            <Input label="Name" required value={form.name} error={errors.name} onChange={(e) => setField('name', e.target.value)} />
            <Input label="Country" value={form.country} onChange={(e) => setField('country', e.target.value)} />
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => setField('status', e.target.value)}
              options={ENTITY_STATUS_OPTIONS}
            />
            <Input label="Image URL" value={form.imageUrl} onChange={(e) => setField('imageUrl', e.target.value)} />
          </div>
          <Textarea label="Description" value={form.description} onChange={(e) => setField('description', e.target.value)} />

          <div className="form-actions">
            <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {isEdit ? 'Save Changes' : 'Create Destination'}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}

export default DestinationForm;
