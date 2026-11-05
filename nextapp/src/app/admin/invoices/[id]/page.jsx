import PermissionGate from '../../../../components/auth/PermissionGate.jsx';
import InvoiceDetail from '../../../../views/admin/invoices/InvoiceDetail.jsx';

export default function Page() {
  return (
    <PermissionGate permission="invoices.view">
      <InvoiceDetail />
    </PermissionGate>
  );
}
