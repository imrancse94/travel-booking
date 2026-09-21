import PermissionGate from '../../../components/auth/PermissionGate.jsx';
import ActivityLogList from '../../../views/admin/activityLogs/ActivityLogList.jsx';

export default function Page() {
  return (
    <PermissionGate permission="activity_logs.view">
      <ActivityLogList />
    </PermissionGate>
  );
}
