'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useResourceList } from '../../../hooks/useResourceList.js';
import { usePermission } from '../../../hooks/usePermission.js';
import {
  Button,
  Card,
  ConfirmDialog,
  EditIcon,
  Pagination,
  PlusCircleIcon,
  SearchFilterBar,
  StatusBadge,
  Table,
  TrashIcon,
  useToast,
} from '../../../components/ui/index.js';
import * as userService from '../../../services/userService.js';

/** Staff/agent user accounts list with role badges and row actions. */
export function UserList() {
  const router = useRouter();
  const { show } = useToast();
  const canCreate = usePermission('users.create');
  const canUpdate = usePermission('users.update');
  const canDelete = usePermission('users.delete');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // The backend leaves the caller's own account out of this list entirely
  // (see userController.list's excludeUserId) -- it manages itself elsewhere
  // (its own profile), not through this screen.
  const list = useResourceList({ fetcher: userService.list });

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => <Link href={`/admin/users/${row.id}/edit`}>{row.firstName} {row.lastName}</Link>,
    },
    { key: 'email', header: 'Email' },
    {
      key: 'roles',
      header: 'Roles',
      render: (row) => (
        <div className="inline-actions">
          {(row.roles || row.userRoles?.map((ur) => ur.role?.name) || []).map((r) => (
            <StatusBadge key={r} status={r} tone="info" />
          ))}
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'actions',
      header: 'Action',
      render: (row) => (
        <div className="inline-actions">
          {canUpdate && (
            <Button icon={<EditIcon />} variant="primary" onClick={() => router.push(`/admin/users/${row.id}/edit`)}>
              Edit
            </Button>
          )}
          {canDelete && (
            <Button icon={<TrashIcon />} variant="danger" onClick={() => setPendingDelete(row)}>
              Delete
            </Button>
          )}
        </div>
      ),
    },
  ];

  async function handleDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await userService.remove(pendingDelete.id);
      show('User deleted', 'success');
      setPendingDelete(null);
      list.reload();
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">Staff and agent accounts with role-based access.</p>
        </div>
        <div className="page-actions">
          {canCreate && (
            <Button variant="success" as={Link} href="/admin/users/new" icon={<PlusCircleIcon />}>
              New User
            </Button>
          )}
        </div>
      </div>

      <Card>
        <SearchFilterBar search={list.search} onSearchChange={list.setSearch} searchPlaceholder="Search by name or email..." />

        <Table columns={columns} rows={list.rows} loading={list.loading} emptyMessage="No users found." />

        <Pagination
          page={list.page}
          limit={list.limit}
          total={list.meta.total}
          totalPages={list.meta.totalPages}
          onPageChange={list.setPage}
        />
      </Card>

      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        title="Delete user"
        message={`Delete "${pendingDelete?.firstName} ${pendingDelete?.lastName}"?`}
        loading={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

export default UserList;
