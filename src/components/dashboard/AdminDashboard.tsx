import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Calendar, GraduationCap, Clock, User, Inbox, Loader2 } from 'lucide-react';
import { format, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { STATUS_LABELS } from '@/lib/constants';
import { cn } from '@/lib/utils';

export function AdminDashboard() {
  const { user } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');
  const dayOfWeek = getDay(new Date());

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['admin-stat-pending'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: todayCount = 0 } = useQuery({
    queryKey: ['admin-stat-today'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('date', today)
        .eq('status', 'confirmed');
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: studentCount = 0 } = useQuery({
    queryKey: ['admin-stat-students'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student')
        .eq('business_owner_id', user!.id);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user?.id,
  });

  // Today's class slots
  const { data: classSlots } = useQuery({
    queryKey: ['admin-today-slots', user?.id, dayOfWeek],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_schedules')
        .select('*')
        .eq('instructor_id', user!.id)
        .eq('day_of_week', dayOfWeek)
        .order('start_time');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: todayAppointments, isLoading: loadingAppts } = useQuery({
    queryKey: ['admin-today-appts', today],
    queryFn: async () => {
      const { data: appts, error } = await supabase
        .from('appointments')
        .select('id, date, time_slot, status, student_id, instructor_id')
        .eq('date', today)
        .in('status', ['pending', 'confirmed', 'delegated'])
        .order('time_slot');
      if (error) throw error;
      if (!appts || appts.length === 0) return [];

      const studentIds = [...new Set(appts.map((a) => a.student_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', studentIds);
      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

      return appts.map((a) => ({
        ...a,
        studentName: profileMap.get(a.student_id)?.name || 'Aluno',
      }));
    },
  });

  const statusVariant = (status: string) => {
    switch (status) {
      case 'confirmed': return 'confirmed';
      case 'pending': return 'pending';
      case 'delegated': return 'delegated';
      default: return 'outline';
    }
  };

  const todayFormatted = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="space-y-1">
        <h1 className="font-display text-3xl text-foreground">Painel Administrativo</h1>
        <p className="text-muted-foreground capitalize">{todayFormatted}</p>
      </div>

      {/* Metric cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <MetricCard icon={Bell} label="Pendentes" value={pendingCount} accent />
        <MetricCard icon={Calendar} label="Treinos Hoje" value={todayCount} />
        <MetricCard icon={GraduationCap} label="Alunos Ativos" value={studentCount} />
      </div>

      {/* Today's agenda */}
      <div className="space-y-4">
        <h2 className="font-display text-xl text-foreground">Agenda de Hoje</h2>

        {loadingAppts ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : !classSlots || classSlots.length === 0 ? (
          <EmptyState message="Você não tem horários configurados para hoje." />
        ) : (
          <div className="space-y-3">
            {classSlots.map((slot) => {
              const slotKey = slot.start_time?.slice(0, 5) || '';
              const slotAppts = todayAppointments?.filter((a: any) => a.time_slot === slotKey) || [];

              return (
                <Card key={slot.id} className={cn(slotAppts.length > 0 && 'border-accent/30')}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">
                          {slotKey} - {slot.end_time?.slice(0, 5)}
                        </span>
                      </div>
                      <div className="flex-1">
                        {slotAppts.length === 0 ? (
                          <span className="text-sm text-muted-foreground">Sem agendamentos</span>
                        ) : (
                          <div className="space-y-2">
                            {slotAppts.map((appt: any) => (
                              <div key={appt.id} className="flex items-center gap-3">
                                <User className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm text-foreground">{appt.studentName}</span>
                                <Badge variant={statusVariant(appt.status) as any}>
                                  {STATUS_LABELS[appt.status] || appt.status}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {slotAppts.length}/{slot.capacity}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: number; accent?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-4">
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', accent ? 'accent-gradient' : 'bg-secondary')}>
          <Icon className={cn('w-6 h-6', accent ? 'text-accent-foreground' : 'text-secondary-foreground')} />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12">
      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
        <Inbox className="w-6 h-6 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}
