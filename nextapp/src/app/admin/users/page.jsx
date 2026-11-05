import PermissionGate from '../../../components/auth/PermissionGate.jsx';
import UserList from '../../../views/admin/users/UserList.jsx';

export default function Page() {
  return (
    <PermissionGate permission="users.view">
      <UserList />
    </PermissionGate>
  );
}
