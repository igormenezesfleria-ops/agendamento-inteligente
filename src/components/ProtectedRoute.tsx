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

  // Redirect admin users who haven't completed onboarding
  if (
    profile &&
    profile.role === 'admin' &&
    !profile.is_onboarded &&
    location.pathname !== '/onboarding'
  ) {
    return <Navigate to="/onboarding" replace />;
  }

  // Subscription guard for admin users
  if (
    profile &&
    profile.role === 'admin' &&
    profile.is_onboarded &&
    location.pathname !== '/subscription' &&
    location.pathname !== '/payment-success'
  ) {
    const status = profile.subscription_status;
    if (status === 'vip') {
      // Always allowed
    } else if (status === 'active' && profile.subscription_expires_at) {
      const expiresAt = new Date(profile.subscription_expires_at);
      if (expiresAt <= new Date()) {
        return <Navigate to="/subscription" replace />;
      }
    } else {
      return <Navigate to="/subscription" replace />;
    }
  }

  // If allowedRoles is specified, check if user has the required role
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
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
