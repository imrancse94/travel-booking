import AuthGate from '../../components/auth/AuthGate.jsx';
import AdminLayout from '../../layouts/AdminLayout.jsx';

// Every /admin/* page is behind the sign-in gate; individual sections add
// their own PermissionGate on top (see each page.jsx).
export default function Layout({ children }) {
  return (
    <AuthGate>
      <AdminLayout>{children}</AdminLayout>
    </AuthGate>
  );
}
