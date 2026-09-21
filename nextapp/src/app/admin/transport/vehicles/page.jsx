import PermissionGate from '../../../../components/auth/PermissionGate.jsx';
import VehicleList from '../../../../views/admin/transport/VehicleList.jsx';

export default function Page() {
  return (
    <PermissionGate permission="transport.view">
      <VehicleList />
    </PermissionGate>
  );
}
