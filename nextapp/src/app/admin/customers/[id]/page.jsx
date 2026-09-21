import PermissionGate from '../../../../components/auth/PermissionGate.jsx';
import CustomerDetail from '../../../../views/admin/customers/CustomerDetail.jsx';

export default function Page() {
  return (
    <PermissionGate permission="customers.view">
      <CustomerDetail />
    </PermissionGate>
  );
}
