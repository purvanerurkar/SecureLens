import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { LoadingSpinner } from '@/components/ui';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner label="Authenticating..." />;
  if (!user) return <Navigate to="/login" replace />;

  return <Outlet />;
}
