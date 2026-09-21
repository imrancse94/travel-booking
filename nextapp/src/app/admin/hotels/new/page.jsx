import PermissionGate from '../../../../components/auth/PermissionGate.jsx';
import HotelForm from '../../../../views/admin/hotels/HotelForm.jsx';

export default function Page() {
  return (
    <PermissionGate permission="hotels.view">
      <HotelForm />
    </PermissionGate>
  );
}
