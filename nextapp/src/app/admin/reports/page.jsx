import PermissionGate from '../../../components/auth/PermissionGate.jsx';
import ReportsHome from '../../../views/admin/reports/ReportsHome.jsx';

export default function Page() {
  return (
    <PermissionGate permission="reports.view">
      <ReportsHome />
    </PermissionGate>
  );
}
