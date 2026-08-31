import PermissionGate from '../../../components/auth/PermissionGate.jsx';
import BookingList from '../../../views/admin/bookings/BookingList.jsx';

export default function Page() {
  return (
    <PermissionGate permission="bookings.view">
      <BookingList />
    </PermissionGate>
  );
}
