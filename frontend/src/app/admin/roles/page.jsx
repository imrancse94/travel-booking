import PermissionGate from '../../../components/auth/PermissionGate.jsx';
import RoleList from '../../../views/admin/roles/RoleList.jsx';

export default function Page() {
  return (
    <PermissionGate permission="roles.view">
      <RoleList />
    </PermissionGate>
  );
}
