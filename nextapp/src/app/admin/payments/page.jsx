import PermissionGate from '../../../components/auth/PermissionGate.jsx';
import PaymentList from '../../../views/admin/payments/PaymentList.jsx';

export default function Page() {
  return (
    <PermissionGate permission="payments.view">
      <PaymentList />
    </PermissionGate>
  );
}
