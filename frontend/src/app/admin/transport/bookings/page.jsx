import PermissionGate from '../../../../components/auth/PermissionGate.jsx';
import TransportBookingList from '../../../../views/admin/transport/TransportBookingList.jsx';

export default function Page() {
  return (
    <PermissionGate permission="transport.view">
      <TransportBookingList />
    </PermissionGate>
  );
}
