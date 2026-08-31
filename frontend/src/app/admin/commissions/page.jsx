import PermissionGate from '../../../components/auth/PermissionGate.jsx';
import CommissionList from '../../../views/admin/commissions/CommissionList.jsx';

export default function Page() {
  return (
    <PermissionGate permission="commissions.view">
      <CommissionList />
    </PermissionGate>
  );
}
