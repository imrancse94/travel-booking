import PermissionGate from '../../../../components/auth/PermissionGate.jsx';
import BookingDetail from '../../../../views/admin/bookings/BookingDetail.jsx';

export default function Page() {
  return (
    <PermissionGate permission="bookings.view">
      <BookingDetail />
    </PermissionGate>
  );
}
