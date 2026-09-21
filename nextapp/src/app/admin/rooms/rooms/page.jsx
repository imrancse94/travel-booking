import PermissionGate from '../../../../components/auth/PermissionGate.jsx';
import RoomList from '../../../../views/admin/rooms/RoomList.jsx';

export default function Page() {
  return (
    <PermissionGate permission="room_types.view">
      <RoomList />
    </PermissionGate>
  );
}
