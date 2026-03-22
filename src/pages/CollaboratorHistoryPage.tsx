import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CollaboratorHistory } from '@/components/collaborator/CollaboratorHistory';

export default function CollaboratorHistoryPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in pb-32">
        <div className="text-center space-y-1 pt-2">
          <h1 className="text-3xl font-extrabold text-slate-900">Histórico de Treinos.</h1>
          <p className="text-slate-500 text-sm">
            Seus treinos concluídos e registro de presença.
          </p>
        </div>
        <CollaboratorHistory />
      </div>
    </DashboardLayout>
  );
}
