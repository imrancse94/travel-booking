import PermissionGate from '../../../../../../components/auth/PermissionGate.jsx';
import RoomTypeForm from '../../../../../../views/admin/rooms/RoomTypeForm.jsx';

export default function Page() {
  return (
    <PermissionGate permission="room_types.view">
      <RoomTypeForm />
    </PermissionGate>
  );
}
