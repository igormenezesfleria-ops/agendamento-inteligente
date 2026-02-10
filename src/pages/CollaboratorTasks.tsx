import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { TaskCard } from '@/components/collaborator/TaskCard';
import { RejectConfirmDialog } from '@/components/collaborator/RejectConfirmDialog';
import { toast } from 'sonner';
import { Loader2, ClipboardList, History } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CollaboratorHistory } from '@/components/collaborator/CollaboratorHistory';

export default function CollaboratorTasks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [pendingRejectId, setPendingRejectId] = useState<string | null>(null);

  // Fetch active tasks assigned to this collaborator
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['myTasks', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: appointments, error: appError } = await supabase
        .from('appointments')
        .select('id, date, time_slot, status, student_id')
        .eq('instructor_id', user.id)
        .in('status', ['delegated', 'confirmed'])
        .order('date', { ascending: true })
        .order('time_slot', { ascending: true });

      if (appError) throw appError;
      if (!appointments || appointments.length === 0) return [];

      const studentIds = [...new Set(appointments.map((a) => a.student_id))];
      const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', studentIds);

      if (profError) throw profError;

      const profileMap = new Map(
        (profiles || []).map((p) => [p.id, p])
      );

      return appointments.map((a) => ({
        ...a,
        profiles: { name: profileMap.get(a.student_id)?.name || 'Aluno' },
      }));
    },
    enabled: !!user?.id,
  });

  const acceptMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'confirmed' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Tarefa aceita!');
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
      setLoadingId(null);
    },
    onError: () => {
      toast.error('Erro ao aceitar tarefa');
      setLoadingId(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'pending', instructor_id: null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Agendamento devolvido para o administrador.');
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
      setLoadingId(null);
    },
    onError: () => {
      toast.error('Erro ao recusar tarefa');
      setLoadingId(null);
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Treino finalizado!');
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
      queryClient.invalidateQueries({ queryKey: ['myHistory'] });
      setLoadingId(null);
    },
    onError: () => {
      toast.error('Erro ao finalizar treino');
      setLoadingId(null);
    },
  });

  const handleAccept = (id: string) => {
    setLoadingId(id);
    acceptMutation.mutate(id);
  };

  const handleRejectRequest = (id: string) => {
    setPendingRejectId(id);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    if (!pendingRejectId) return;
    setLoadingId(pendingRejectId);
    rejectMutation.mutate(pendingRejectId);
    setRejectDialogOpen(false);
    setPendingRejectId(null);
  };

  const handleComplete = (id: string) => {
    setLoadingId(id);
    completeMutation.mutate(id);
  };

  const pendingTasks = tasks?.filter((t: any) => t.status === 'delegated');
  const confirmedTasks = tasks?.filter((t: any) => t.status === 'confirmed');

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="space-y-2">
          <h1 className="font-display text-3xl text-foreground">Minhas Tarefas</h1>
          <p className="text-muted-foreground">
            Gerencie os treinos delegados a você.
          </p>
        </div>

        <Tabs defaultValue="tasks" className="space-y-6">
          <TabsList>
            <TabsTrigger value="tasks">
              <ClipboardList className="w-4 h-4 mr-2" />
              Tarefas Ativas
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="w-4 h-4 mr-2" />
              Meus Treinos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
              </div>
            ) : tasks?.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="space-y-8">
                {pendingTasks && pendingTasks.length > 0 && (
                  <Section title="Aguardando Aceite" count={pendingTasks.length}>
                    {pendingTasks.map((task: any) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        type="pending"
                        isLoading={loadingId === task.id}
                        onAccept={handleAccept}
                        onReject={handleRejectRequest}
                        onComplete={handleComplete}
                      />
                    ))}
                  </Section>
                )}

                {confirmedTasks && confirmedTasks.length > 0 && (
                  <Section title="Confirmados" count={confirmedTasks.length}>
                    {confirmedTasks.map((task: any) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        type="confirmed"
                        isLoading={loadingId === task.id}
                        onAccept={handleAccept}
                        onReject={handleRejectRequest}
                        onComplete={handleComplete}
                      />
                    ))}
                  </Section>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history">
            <CollaboratorHistory />
          </TabsContent>
        </Tabs>

        <RejectConfirmDialog
          open={rejectDialogOpen}
          onOpenChange={setRejectDialogOpen}
          onConfirm={handleRejectConfirm}
        />
      </div>
    </DashboardLayout>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h2 className="font-display text-lg text-foreground flex items-center gap-2">
        {title}
        <Badge variant="secondary">{count}</Badge>
      </h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
        <ClipboardList className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="font-display text-lg text-foreground mb-2">
        Nenhuma tarefa
      </h3>
      <p className="text-muted-foreground">
        Você não tem tarefas delegadas no momento.
      </p>
    </div>
  );
}
