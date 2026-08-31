import PermissionGate from '../../../../components/auth/PermissionGate.jsx';
import DriverList from '../../../../views/admin/transport/DriverList.jsx';

export default function Page() {
  return (
    <PermissionGate permission="transport.view">
      <DriverList />
    </PermissionGate>
  );
}
