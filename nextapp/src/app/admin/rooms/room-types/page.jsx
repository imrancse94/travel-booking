import PermissionGate from '../../../../components/auth/PermissionGate.jsx';
import RoomTypeList from '../../../../views/admin/rooms/RoomTypeList.jsx';

export default function Page() {
  return (
    <PermissionGate permission="room_types.view">
      <RoomTypeList />
    </PermissionGate>
  );
}
