import PermissionGate from '../../../../../components/auth/PermissionGate.jsx';
import UserForm from '../../../../../views/admin/users/UserForm.jsx';

export default function Page() {
  return (
    <PermissionGate permission="users.view">
      <UserForm />
    </PermissionGate>
  );
}
