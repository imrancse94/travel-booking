import PermissionGate from '../../../components/auth/PermissionGate.jsx';
import InvoiceList from '../../../views/admin/invoices/InvoiceList.jsx';

export default function Page() {
  return (
    <PermissionGate permission="invoices.view">
      <InvoiceList />
    </PermissionGate>
  );
}
