import PermissionGate from '../../../components/auth/PermissionGate.jsx';
import HotelList from '../../../views/admin/hotels/HotelList.jsx';

export default function Page() {
  return (
    <PermissionGate permission="hotels.view">
      <HotelList />
    </PermissionGate>
  );
}
