import PermissionGate from '../../../../components/auth/PermissionGate.jsx';
import RatePlanList from '../../../../views/admin/rooms/RatePlanList.jsx';

export default function Page() {
  return (
    <PermissionGate permission="room_types.view">
      <RatePlanList />
    </PermissionGate>
  );
}
