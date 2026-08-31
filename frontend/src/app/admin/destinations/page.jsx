import PermissionGate from '../../../components/auth/PermissionGate.jsx';
import DestinationList from '../../../views/admin/destinations/DestinationList.jsx';

export default function Page() {
  return (
    <PermissionGate permission="destinations.view">
      <DestinationList />
    </PermissionGate>
  );
}
