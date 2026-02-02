import { useState } from 'react';
import { format, isToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { TIME_SLOTS, STATUS_LABELS } from '@/lib/constants';
import { toast } from 'sonner';
import { Loader2, Calendar, Clock, User, Check, X, CheckCircle2, ClipboardList } from 'lucide-react';

export default function CollaboratorTasks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Fetch tasks assigned to this collaborator
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['myTasks', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          date,
          time_slot,
          status,
          student_id,
          profiles!appointments_student_id_fkey(name)
        `)
        .eq('instructor_id', user.id)
        .in('status', ['delegated', 'confirmed', 'completed'])
        .order('date', { ascending: true })
        .order('time_slot', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Accept task
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

  // Reject task
  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'rejected', instructor_id: null })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Tarefa recusada');
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
      setLoadingId(null);
    },
    onError: () => {
      toast.error('Erro ao recusar tarefa');
      setLoadingId(null);
    },
  });

  // Complete training
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

  const handleReject = (id: string) => {
    setLoadingId(id);
    rejectMutation.mutate(id);
  };

  const handleComplete = (id: string) => {
    setLoadingId(id);
    completeMutation.mutate(id);
  };

  const pendingTasks = tasks?.filter((t: any) => t.status === 'delegated');
  const confirmedTasks = tasks?.filter((t: any) => t.status === 'confirmed');
  const completedTasks = tasks?.filter((t: any) => t.status === 'completed');

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="space-y-2">
          <h1 className="font-display text-3xl text-foreground">Minhas Tarefas</h1>
          <p className="text-muted-foreground">
            Gerencie os treinos delegados a você.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : tasks?.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-8">
            {/* Pending tasks */}
            {pendingTasks && pendingTasks.length > 0 && (
              <Section title="Aguardando Aceite" count={pendingTasks.length}>
                {pendingTasks.map((task: any) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    type="pending"
                    isLoading={loadingId === task.id}
                    onAccept={handleAccept}
                    onReject={handleReject}
                    onComplete={handleComplete}
                  />
                ))}
              </Section>
            )}

            {/* Confirmed tasks */}
            {confirmedTasks && confirmedTasks.length > 0 && (
              <Section title="Confirmados" count={confirmedTasks.length}>
                {confirmedTasks.map((task: any) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    type="confirmed"
                    isLoading={loadingId === task.id}
                    onAccept={handleAccept}
                    onReject={handleReject}
                    onComplete={handleComplete}
                  />
                ))}
              </Section>
            )}

            {/* Completed tasks */}
            {completedTasks && completedTasks.length > 0 && (
              <Section title="Concluídos" count={completedTasks.length}>
                {completedTasks.map((task: any) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    type="completed"
                    isLoading={false}
                    onAccept={handleAccept}
                    onReject={handleReject}
                    onComplete={handleComplete}
                  />
                ))}
              </Section>
            )}
          </div>
        )}
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

interface TaskCardProps {
  task: any;
  type: 'pending' | 'confirmed' | 'completed';
  isLoading: boolean;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onComplete: (id: string) => void;
}

function TaskCard({ task, type, isLoading, onAccept, onReject, onComplete }: TaskCardProps) {
  const slot = TIME_SLOTS.find((s) => s.id === task.time_slot);
  const taskDate = parseISO(task.date);
  const isTodayTask = isToday(taskDate);
  const formattedDate = format(taskDate, "EEEE, d 'de' MMMM", { locale: ptBR });

  return (
    <Card className="card-hover">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-accent" />
              <span className="font-semibold text-foreground">{task.profiles?.name || 'Aluno'}</span>
              {isTodayTask && (
                <Badge variant="confirmed" className="text-xs">Hoje</Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span className="capitalize">{formattedDate}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{slot?.label || task.time_slot}</span>
              </div>
            </div>
            <Badge variant={task.status}>
              {STATUS_LABELS[task.status]}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {type === 'pending' && (
              <>
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => onAccept(task.id)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      Aceitar
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => onReject(task.id)}
                  disabled={isLoading}
                >
                  <X className="w-4 h-4 mr-1" />
                  Recusar
                </Button>
              </>
            )}

            {type === 'confirmed' && isTodayTask && (
              <Button
                variant="accent"
                size="sm"
                onClick={() => onComplete(task.id)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Finalizar Treino
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
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
