import PermissionGate from '../../../../../../components/auth/PermissionGate.jsx';
import TourPackageForm from '../../../../../../views/admin/tours/TourPackageForm.jsx';

export default function Page() {
  return (
    <PermissionGate permission="tours.view">
      <TourPackageForm />
    </PermissionGate>
  );
}
