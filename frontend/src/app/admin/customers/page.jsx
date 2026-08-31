import PermissionGate from '../../../components/auth/PermissionGate.jsx';
import CustomerList from '../../../views/admin/customers/CustomerList.jsx';

export default function Page() {
  return (
    <PermissionGate permission="customers.view">
      <CustomerList />
    </PermissionGate>
  );
}
