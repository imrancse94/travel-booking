'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Input,
  Loader,
  Modal,
  PlusCircleIcon,
  SearchFilterBar,
  Textarea,
  useToast,
} from '../../../components/ui/index.js';
import { usePermission } from '../../../hooks/usePermission.js';
import * as roleService from '../../../services/roleService.js';
import { PermissionAccordion } from './PermissionAccordion.jsx';

const EMPTY_CREATE_FORM = { name: '', description: '' };

function groupByModule(permissions) {
  const groups = {};
  permissions.forEach((perm) => {
    const key = perm.module || perm.name.split('.')[0];
    if (!groups[key]) groups[key] = [];
    groups[key].push(perm);
  });
  return Object.keys(groups)
    .sort()
    .map((module) => ({ module, permissions: groups[module].sort((a, b) => a.name.localeCompare(b.name)) }));
}

/**
 * Roles & Permissions: a role list on the left, and a permission editor
 * (checkboxes grouped by module) for the selected role on the right. A new
 * role is created with no permissions -- they're granted afterward from the
 * same editor, rather than a second copy of it inside the creation modal.
 */
export function RoleList() {
  const { show } = useToast();
  const canCreate = usePermission('roles.create');
  const canUpdate = usePermission('roles.update');

  const [roles, setRoles] = useState([]);
  const [roleSearch, setRoleSearch] = useState('');
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState([]);
  const [saving, setSaving] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);
  const [creating, setCreating] = useState(false);

  function load() {
    setLoading(true);
    return Promise.all([roleService.listRoles(), roleService.listPermissions()])
      .then(([rolesRes, permsRes]) => {
        const loadedRoles = rolesRes.data || [];
        setRoles(loadedRoles);
        setPermissions(permsRes.data || []);
        if (loadedRoles.length && !selectedRoleId) {
          setSelectedRoleId(loadedRoles[0].id);
          setSelectedPermissionIds((loadedRoles[0].permissions || []).map((p) => p.id));
        }
        return loadedRoles;
      })
      .catch((err) => {
        show(err.message, 'error');
        return [];
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedRole = roles.find((r) => r.id === selectedRoleId) || null;
  const groupedPermissions = useMemo(() => groupByModule(permissions), [permissions]);
  const visibleRoles = useMemo(() => {
    const term = roleSearch.trim().toLowerCase();
    return term ? roles.filter((r) => r.name.toLowerCase().includes(term)) : roles;
  }, [roles, roleSearch]);

  function selectRole(role) {
    setSelectedRoleId(role.id);
    setSelectedPermissionIds((role.permissions || []).map((p) => p.id));
  }

  function togglePermission(permissionId) {
    setSelectedPermissionIds((prev) =>
      prev.includes(permissionId) ? prev.filter((id) => id !== permissionId) : [...prev, permissionId]
    );
  }

  function toggleModule(modulePermissions, allSelected) {
    const ids = modulePermissions.map((p) => p.id);
    setSelectedPermissionIds((prev) =>
      allSelected ? prev.filter((id) => !ids.includes(id)) : Array.from(new Set([...prev, ...ids]))
    );
  }

  async function handleSavePermissions() {
    if (!selectedRole) return;
    setSaving(true);
    try {
      await roleService.updateRolePermissions(selectedRole.id, selectedPermissionIds);
      show('Permissions updated', 'success');
      await load();
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  function openCreate() {
    setCreateForm(EMPTY_CREATE_FORM);
    setCreateOpen(true);
  }

  async function handleCreateRole(e) {
    e.preventDefault();
    if (!createForm.name.trim()) return;
    setCreating(true);
    try {
      // Created with no permissions -- granted afterward from the editor on
      // the right, the same place every other role's permissions are managed.
      const res = await roleService.createRole({ ...createForm, permissionIds: [] });
      show('Role created', 'success');
      setCreateOpen(false);
      const reloadedRoles = await load();
      const created = reloadedRoles.find((r) => r.id === res?.data?.id);
      if (created) selectRole(created);
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <Loader label="Loading roles..." />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Roles &amp; Permissions</h1>
          <p className="page-subtitle">Manage staff roles and the granular permissions each one grants.</p>
        </div>
        <div className="page-actions">{canCreate && <Button variant="success" onClick={openCreate} icon={<PlusCircleIcon />}>New Role</Button>}</div>
      </div>

      <div className="role-manager">
        <Card title="Roles" className="role-manager__list">
          <SearchFilterBar search={roleSearch} onSearchChange={setRoleSearch} searchPlaceholder="Search roles..." />
          <div className="role-manager__roles">
            {visibleRoles.map((role) => (
              <button
                key={role.id}
                type="button"
                className={`role-manager__role-item ${role.id === selectedRoleId ? 'role-manager__role-item--active' : ''}`}
                onClick={() => selectRole(role)}
              >
                <span className="role-manager__role-name">{role.name}</span>
                <span className="role-manager__role-count">{(role.permissions || []).length} perms</span>
              </button>
            ))}
            {roles.length === 0 && <p className="text-muted">No roles defined yet.</p>}
            {roles.length > 0 && visibleRoles.length === 0 && (
              <p className="text-muted">No roles match &quot;{roleSearch}&quot;.</p>
            )}
          </div>
        </Card>

        <Card
          title={selectedRole ? `Permissions — ${selectedRole.name}` : 'Permissions'}
          className="role-manager__editor"
          actions={
            canUpdate &&
            selectedRole && (
              <Button loading={saving} onClick={handleSavePermissions}>
                Save Changes
              </Button>
            )
          }
        >
          {!selectedRole ? (
            <p className="text-muted">Select a role to view and edit its permissions.</p>
          ) : (
            <PermissionAccordion
              key={selectedRole.id}
              groups={groupedPermissions}
              selectedIds={selectedPermissionIds}
              onToggle={togglePermission}
              onToggleModule={canUpdate ? toggleModule : undefined}
              disabled={!canUpdate}
            />
          )}
        </Card>
      </div>

      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New Role"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="success" onClick={handleCreateRole} loading={creating}>
              Create Role
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateRole}>
          <div className="form-grid">
            <Input
              label="Role Name"
              required
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
            />
          </div>
          <Textarea
            label="Description"
            value={createForm.description}
            onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
          />
        </form>
      </Modal>
    </div>
  );
}

export default RoleList;
