import PermissionGate from '../../../../../components/auth/PermissionGate.jsx';
import RoomForm from '../../../../../views/admin/rooms/RoomForm.jsx';

export default function Page() {
  return (
    <PermissionGate permission="room_types.view">
      <RoomForm />
    </PermissionGate>
  );
}
