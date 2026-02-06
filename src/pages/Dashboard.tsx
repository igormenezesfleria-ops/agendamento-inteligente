import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StudentDashboard } from '@/components/dashboard/StudentDashboard';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';
import { CollaboratorDashboard } from '@/components/dashboard/CollaboratorDashboard';
import { Loader2 } from 'lucide-react';

export default function Dashboard() {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const role = profile?.role || 'student';

  // Redirect to role-specific route if on generic /dashboard
  useEffect(() => {
    if (!loading && profile && location.pathname === '/dashboard') {
      switch (role) {
        case 'admin':
          navigate('/dashboard/admin', { replace: true });
          break;
        case 'collaborator':
          navigate('/dashboard/collaborator', { replace: true });
          break;
        default:
          navigate('/dashboard/student', { replace: true });
      }
    }
  }, [loading, profile, role, navigate, location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      {role === 'admin' && <AdminDashboard />}
      {role === 'collaborator' && <CollaboratorDashboard />}
      {role === 'student' && <StudentDashboard />}
    </DashboardLayout>
  );
}
