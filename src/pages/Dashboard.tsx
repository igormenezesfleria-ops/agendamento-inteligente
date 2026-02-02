import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StudentDashboard } from '@/components/dashboard/StudentDashboard';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';
import { CollaboratorDashboard } from '@/components/dashboard/CollaboratorDashboard';
import { Loader2 } from 'lucide-react';

export default function Dashboard() {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  const role = profile?.role || 'student';

  return (
    <DashboardLayout>
      {role === 'admin' && <AdminDashboard />}
      {role === 'collaborator' && <CollaboratorDashboard />}
      {role === 'student' && <StudentDashboard />}
    </DashboardLayout>
  );
}
