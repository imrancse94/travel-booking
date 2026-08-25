import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Input, Loader, Select, useToast } from '../../../components/ui/index.js';
import * as userService from '../../../services/userService.js';
import * as roleService from '../../../services/roleService.js';
import { ENTITY_STATUS_OPTIONS } from '../../../constants/options.js';

const EMPTY_FORM = { firstName: '', lastName: '', email: '', phone: '', password: '', status: 'active' };

/** Create/Edit form for a staff/agent user, including role assignment via a checkbox multi-select. */
export function UserForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
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
      .catch((err) => show(err.message, 'error'))
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
    if (!isEdit && !form.password) next.password = 'Password is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
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
      navigate('/admin/users');
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loader label="Loading user..." />;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{isEdit ? 'Edit User' : 'New User'}</h1>
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
          </div>

          <div className="form-actions">
            <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
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
