import PermissionGate from '../../../../components/auth/PermissionGate.jsx';
import TourPackageList from '../../../../views/admin/tours/TourPackageList.jsx';

export default function Page() {
  return (
    <PermissionGate permission="tours.view">
      <TourPackageList />
    </PermissionGate>
  );
}
