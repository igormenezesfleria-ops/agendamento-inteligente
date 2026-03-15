import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, Calendar, GraduationCap, ChevronRight, Zap, BarChart3, Settings, Tag, User } from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { PersonalImpactReceipt } from '@/components/admin/PersonalImpactReceipt';
import { toLocalDateTime } from '@/lib/deadline';

export function AdminDashboard() {
  const { user } = useAuth();
  const [showImpact, setShowImpact] = useState(false);
  const today = format(new Date(), 'yyyy-MM-dd');
  const dayOfWeek = getDay(new Date());
  const nowTime = format(new Date(), 'HH:mm');

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

  // Find the next upcoming appointment for today
  const nextClass = useMemo(() => {
    if (!todayAppointments || !classSlots) return null;
    const confirmedAppts = todayAppointments
      .filter((a: any) => a.status === 'confirmed' && a.time_slot >= nowTime)
      .sort((a: any, b: any) => a.time_slot.localeCompare(b.time_slot));
    if (confirmedAppts.length === 0) return null;
    const appt = confirmedAppts[0] as any;
    const slot = classSlots.find((s) => s.start_time?.slice(0, 5) === appt.time_slot);
    return {
      time: appt.time_slot,
      endTime: slot?.end_time?.slice(0, 5) || '',
      studentName: appt.studentName,
      className: slot?.class_name || 'Treino',
    };
  }, [todayAppointments, classSlots, nowTime]);

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
    <div className="space-y-6 animate-fade-in max-w-full overflow-hidden">
      <div className="space-y-1">
        <h1 className="font-display text-2xl sm:text-3xl text-foreground">Painel Administrativo</h1>
        <p className="text-muted-foreground capitalize">{todayFormatted}</p>
      </div>

      {/* Quick Actions — compact horizontal row */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acesso Rápido</p>
        <div className="flex flex-row justify-between items-start gap-2">
          <QuickActionCard icon={GraduationCap} label="Meus Alunos" to="/dashboard/meus-alunos" color="accent" />
          <QuickActionCard icon={Calendar} label="Agenda" to="/dashboard/agenda" color="primary" />
          <QuickActionCard icon={Tag} label="Planos" to="/dashboard/admin/plans" color="warning" />
          <QuickActionCard icon={Settings} label="Horários" to="/dashboard/configurar-horarios" color="secondary" />
        </div>
      </div>

      {/* Impact Report CTA */}
      <Card className="bg-slate-900 border-orange-500/30 overflow-hidden">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center shrink-0">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Relatório de Impacto</p>
            <p className="text-xs text-slate-400">Compartilhe seus resultados nos Stories</p>
          </div>
          <Button
            onClick={() => setShowImpact(true)}
            size="sm"
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold shrink-0"
          >
            📊 Gerar
          </Button>
        </CardContent>
      </Card>

      {/* Alert Cards */}
      <div className="flex flex-col gap-3">
        <Link to="/dashboard/solicitacoes">
          <Card className="border-warning/30 hover:shadow-md transition-shadow cursor-pointer active:scale-[0.98]">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-warning/15 flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5 text-warning" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">{pendingCount} Solicitações Pendentes</p>
                <p className="text-xs text-muted-foreground">Toque para revisar</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </CardContent>
          </Card>
        </Link>

        <Card className="border-accent/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">{todayCount} Treinos Hoje</p>
              <p className="text-xs text-muted-foreground">{studentCount} alunos ativos</p>
            </div>
          </CardContent>
        </Card>
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
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                      {/* Time + capacity row */}
                      <div className="flex items-center justify-between sm:justify-start gap-2 sm:min-w-[120px]">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="font-medium text-foreground text-sm">
                            {slotKey} - {slot.end_time?.slice(0, 5)}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs sm:hidden shrink-0">
                          {slotAppts.length}/{slot.capacity}
                        </Badge>
                      </div>

                      {/* Students */}
                      <div className="flex-1 min-w-0">
                        {slotAppts.length === 0 ? (
                          <span className="text-sm text-muted-foreground/40">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {slotAppts.map((appt: any) => (
                              <div key={appt.id} className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-2.5 py-1.5">
                                <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <span className="text-sm text-foreground truncate max-w-[120px] sm:max-w-none">{appt.studentName}</span>
                                <Badge variant={statusVariant(appt.status) as any} className="text-[10px] px-1.5 py-0">
                                  {STATUS_LABELS[appt.status] || appt.status}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Capacity badge - desktop only */}
                      <Badge variant="outline" className="text-xs hidden sm:inline-flex shrink-0">
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

function MetricCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-secondary shrink-0">
          <Icon className="w-6 h-6 text-secondary-foreground" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

const quickActionColors: Record<string, { bg: string; icon: string }> = {
  accent: { bg: 'bg-accent/15', icon: 'text-accent' },
  primary: { bg: 'bg-primary/15', icon: 'text-primary' },
  warning: { bg: 'bg-warning/15', icon: 'text-warning' },
  secondary: { bg: 'bg-secondary', icon: 'text-secondary-foreground' },
};

function QuickActionCard({ icon: Icon, label, to, color }: { icon: React.ElementType; label: string; to: string; color: string }) {
  const c = quickActionColors[color] || quickActionColors.secondary;
  return (
    <Link to={to} className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
      <div className={cn('w-12 h-12 rounded-2xl shadow-sm flex items-center justify-center bg-card border border-border', c.bg)}>
        <Icon className={cn('w-5 h-5', c.icon)} />
      </div>
      <span className="text-[10px] font-semibold text-muted-foreground text-center leading-tight">{label}</span>
    </Link>
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
