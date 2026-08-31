import PermissionGate from '../../../../components/auth/PermissionGate.jsx';
import TourBookingList from '../../../../views/admin/tours/TourBookingList.jsx';

export default function Page() {
  return (
    <PermissionGate permission="tours.view">
      <TourBookingList />
    </PermissionGate>
  );
}
