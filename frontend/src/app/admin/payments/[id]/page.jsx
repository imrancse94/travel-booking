import PermissionGate from '../../../../components/auth/PermissionGate.jsx';
import PaymentDetail from '../../../../views/admin/payments/PaymentDetail.jsx';

export default function Page() {
  return (
    <PermissionGate permission="payments.view">
      <PaymentDetail />
    </PermissionGate>
  );
}
