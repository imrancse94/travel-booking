import PermissionGate from '../../../components/auth/PermissionGate.jsx';
import ServiceList from '../../../views/admin/services/ServiceList.jsx';

export default function Page() {
  return (
    <PermissionGate permission="services.view">
      <ServiceList />
    </PermissionGate>
  );
}
