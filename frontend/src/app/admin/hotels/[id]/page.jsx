import PermissionGate from '../../../../components/auth/PermissionGate.jsx';
import HotelDetail from '../../../../views/admin/hotels/HotelDetail.jsx';

export default function Page() {
  return (
    <PermissionGate permission="hotels.view">
      <HotelDetail />
    </PermissionGate>
  );
}
