'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeftIcon, Button, Card, Input, Loader, Select, useToast } from '../../../components/ui/index.js';
import * as userService from '../../../services/userService.js';
import * as roleService from '../../../services/roleService.js';
import { ENTITY_STATUS_OPTIONS } from '../../../constants/options.js';
import { apiFieldErrors, toastFromApiError, toastFromFieldErrors } from '../../../utils/formErrors.js';

const EMPTY_FORM = { firstName: '', lastName: '', email: '', phone: '', password: '', status: 'active' };

/** Create/Edit form for a staff/agent user, including role assignment via a checkbox multi-select. */
export function UserForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const router = useRouter();
  const { show } = useToast();

  const [form, setForm] = useState(EMPTY_FORM);
  const [roles, setRoles] = useState([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    roleService
      .listRoles()
      .then((res) => setRoles(res.data || []))
      .catch(() => setRoles([]));
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    userService
      .getById(id)
      .then((res) => {
        const user = res.data;
        setForm({ ...EMPTY_FORM, ...user, password: '' });
        const ids = (user.userRoles || []).map((ur) => ur.roleId || ur.role?.id).filter(Boolean);
        setSelectedRoleIds(ids);
      })
      .catch((err) => show(toastFromApiError(err, 'Could not load this user'), 'error'))
      .finally(() => setLoading(false));
  }, [id, isEdit, show]);

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleRole(roleId) {
    setSelectedRoleIds((prev) => (prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId]));
  }

  function validate() {
    const next = {};
    if (!form.firstName.trim()) next.firstName = 'First name is required.';
    if (!form.lastName.trim()) next.lastName = 'Last name is required.';
    if (!form.email.trim()) next.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Enter a valid email address.';
    if (!isEdit && !form.password) next.password = 'Password is required.';
    // Matches the API's own minimum, so the failure is caught before a round
    // trip rather than coming back as a 422.
    else if (form.password && form.password.length < 8) {
      next.password = 'Password must be at least 8 characters.';
    }
    if (selectedRoleIds.length === 0) next.roles = 'Assign at least one role.';
    setErrors(next);
    return next;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const invalid = validate();
    if (Object.keys(invalid).length > 0) {
      // Previously this returned silently: the inline field errors appeared but
      // nothing was announced, so a submit with the offending field scrolled
      // out of view looked like the button had simply done nothing.
      show(toastFromFieldErrors(invalid), 'error');
      return;
    }

    setSaving(true);
    const payload = { ...form, roleIds: selectedRoleIds };
    if (isEdit && !payload.password) delete payload.password;

    try {
      if (isEdit) {
        await userService.update(id, payload);
      } else {
        await userService.create(payload);
      }
      show(isEdit ? 'User updated' : 'User created', 'success');
      router.push('/admin/users');
    } catch (err) {
      // The API names the offending fields in err.errors; surface them on the
      // inputs as well as in the toast instead of showing "Validation failed".
      setErrors((prev) => ({ ...prev, ...apiFieldErrors(err) }));
      show(toastFromApiError(err, isEdit ? 'Could not update the user' : 'Could not create the user'), 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loader label="Loading user..." />;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{isEdit ? 'Edit User' : 'New User'}</h1>
        <div className="page-actions">
          <Button icon={<ArrowLeftIcon />} variant="primary" onClick={() => router.push('/admin/users')}>
            Back
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <div className="form-grid">
            <Input label="First Name" required value={form.firstName} error={errors.firstName} onChange={(e) => setField('firstName', e.target.value)} />
            <Input label="Last Name" required value={form.lastName} error={errors.lastName} onChange={(e) => setField('lastName', e.target.value)} />
            <Input label="Email" type="email" required value={form.email} error={errors.email} onChange={(e) => setField('email', e.target.value)} />
            <Input label="Phone" value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
            <Input
              label={isEdit ? 'New Password (leave blank to keep)' : 'Password'}
              type="password"
              required={!isEdit}
              value={form.password}
              error={errors.password}
              onChange={(e) => setField('password', e.target.value)}
            />
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => setField('status', e.target.value)}
              options={ENTITY_STATUS_OPTIONS}
            />
          </div>

          <div className="form-section">
            <h3 className="form-section__title">Roles</h3>
            <div className="form-grid">
              {roles.map((role) => (
                <label key={role.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <input
                    type="checkbox"
                    checked={selectedRoleIds.includes(role.id)}
                    onChange={() => toggleRole(role.id)}
                  />
                  {role.name}
                </label>
              ))}
              {roles.length === 0 && <p className="text-muted">No roles defined yet.</p>}
            </div>
            {errors.roles && <p className="form-field__message form-field__message--error">{errors.roles}</p>}
          </div>

          <div className="form-actions">
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {isEdit ? 'Save Changes' : 'Create User'}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}

export default UserForm;
