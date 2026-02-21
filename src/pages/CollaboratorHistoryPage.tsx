import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CollaboratorHistory } from '@/components/collaborator/CollaboratorHistory';

export default function CollaboratorHistoryPage() {
  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="space-y-2">
          <h1 className="font-display text-3xl text-foreground">Histórico de Treinos</h1>
          <p className="text-muted-foreground">
            Seus treinos concluídos e registro de presença dos alunos.
          </p>
        </div>
        <CollaboratorHistory />
      </div>
    </DashboardLayout>
  );
}
