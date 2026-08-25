import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export function ProtectedRoute({ permission, role }) {
  const { isAuthenticated, isLoading, hasPermission, hasRole } = useAuth();
  const location = useLocation();

  if (isLoading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (permission && !hasPermission(permission)) {
    return <Navigate to="/" replace />;
  }
  if (role && !hasRole(role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
