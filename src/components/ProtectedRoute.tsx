import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If allowedRoles is specified, check if user has the required role
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    // Redirect to the correct role-based dashboard
    const role = profile.role;
    switch (role) {
      case 'admin':
        return <Navigate to="/dashboard/admin" replace />;
      case 'collaborator':
        return <Navigate to="/dashboard/collaborator" replace />;
      default:
        return <Navigate to="/dashboard/student" replace />;
    }
  }

  return <>{children}</>;
}
