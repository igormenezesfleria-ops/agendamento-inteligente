import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, Calendar, GraduationCap, ChevronRight, Zap, BarChart3, Settings, Tag, User } from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Link } from 'react-router-dom';
import { PersonalImpactReceipt } from '@/components/admin/PersonalImpactReceipt';
import { toLocalDateTime } from '@/lib/deadline';

export function AdminDashboard() {
  const { user, profile } = useAuth();
  const [showImpact, setShowImpact] = useState(false);
  const today = format(new Date(), 'yyyy-MM-dd');

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

  const { data: nextAppointment } = useQuery({
    queryKey: ['admin-next-appointment', user?.id],
    queryFn: async () => {
      // Fetch upcoming confirmed appointments for the entire studio
      const { data: appts, error } = await supabase
        .from('appointments')
        .select('id, date, time_slot, status, student_id, instructor_id')
        .in('status', ['confirmed', 'delegated'])
        .gte('date', today)
        .order('date')
        .order('time_slot')
        .limit(20);
      if (error) throw error;
      if (!appts || appts.length === 0) return null;

      // Filter to only future appointments (date+time > now)
      const now = new Date();
      const future = appts.filter((a) => toLocalDateTime(a.date, a.time_slot) > now);
      if (future.length === 0) return null;

      const appt = future[0];

      // Fetch student name
      const { data: studentProfile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', appt.student_id)
        .single();

      // Fetch instructor name if different from admin
      let instructorLabel = 'Você (Admin)';
      if (appt.instructor_id && appt.instructor_id !== user!.id) {
        const { data: instrProfile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', appt.instructor_id)
          .single();
        instructorLabel = instrProfile?.name || 'Colaborador';
      }

      const apptDate = new Date(appt.date + 'T00:00:00');
      let dateLabel: string;
      if (isToday(apptDate)) {
        dateLabel = 'Hoje';
      } else if (isTomorrow(apptDate)) {
        dateLabel = 'Amanhã';
      } else {
        dateLabel = format(apptDate, "EEEE, d 'de' MMM", { locale: ptBR });
      }

      return {
        dateLabel,
        time: appt.time_slot,
        studentName: studentProfile?.name || 'Aluno',
        instructorLabel,
      };
    },
    enabled: !!user?.id,
    refetchInterval: 60_000,
  });

  const todayFormatted = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });

  return (
    <div className="space-y-6 animate-fade-in max-w-full overflow-hidden">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          Olá, {profile?.name?.split(' ')[0] || 'Igor'}! 👋
        </h1>
        <p className="text-sm text-muted-foreground capitalize">{todayFormatted}</p>
      </div>

      {/* Quick Actions */}
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

        {/* Next Appointment Card */}
        <Card className="border-accent/30">
          <CardContent className="p-4">
            {nextAppointment ? (
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Próximo Agendamento</p>
                  <p className="text-base font-bold text-foreground">
                    {nextAppointment.dateLabel}, {nextAppointment.time}
                  </p>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 shrink-0" />
                      Aluno: {nextAppointment.studentName}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                      Professor: {nextAppointment.instructorLabel}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">Sem mais treinos agendados!</p>
                  <p className="text-xs text-muted-foreground">Dia de descanso! 💪</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {showImpact && <PersonalImpactReceipt open={showImpact} onOpenChange={setShowImpact} />}
    </div>
  );
}

function QuickActionCard({ icon: Icon, label, to }: { icon: React.ElementType; label: string; to: string; color: string }) {
  return (
    <Link to={to} className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
      <div className="w-12 h-12 rounded-2xl shadow-sm flex items-center justify-center bg-accent/10 border border-accent/20">
        <Icon className="w-5 h-5 text-accent" />
      </div>
      <span className="text-[10px] font-semibold text-foreground text-center leading-tight">{label}</span>
    </Link>
  );
}
