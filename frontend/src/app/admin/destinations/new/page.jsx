import PermissionGate from '../../../../components/auth/PermissionGate.jsx';
import DestinationForm from '../../../../views/admin/destinations/DestinationForm.jsx';

export default function Page() {
  return (
    <PermissionGate permission="destinations.view">
      <DestinationForm />
    </PermissionGate>
  );
}
