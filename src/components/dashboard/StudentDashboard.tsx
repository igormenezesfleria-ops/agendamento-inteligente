import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock, ArrowRight, Dumbbell, ClipboardList, MapPin } from 'lucide-react';
import { AnnouncementsFeed } from '@/components/dashboard/AnnouncementsFeed';
import { StudioLinkCard } from '@/components/student/StudioLinkCard';

import { ActiveWorkoutCard } from '@/components/student/ActiveWorkoutCard';
import { StreakBadge } from '@/components/student/StreakBadge';
import { QuestionnaireModal } from '@/components/student/QuestionnaireModal';
import { PSEFeedbackModal } from '@/components/student/PSEFeedbackModal';
import { StudentOnboardingFlow } from '@/components/student/StudentOnboardingFlow';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function StudentDashboard() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pseOpen, setPseOpen] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<{ id: string; type: string } | null>(null);

  // Determine if onboarding is needed and which step to start at.
  // Sequential: Triage first, then PAR-Q / Termo. Never both at once.
  const needsTriage = !!profile?.business_owner_id && profile?.profile_completed === false;
  const needsLiability = !!profile?.business_owner_id && !(profile as any)?.liability_accepted;
  const showOnboarding = needsTriage || needsLiability;
  const onboardingStartStep: 'triage' | 'parq' = needsTriage ? 'triage' : 'parq';

  const { data: nextAppointment, isLoading } = useQuery({
    queryKey: ['next-appointment', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const nowTime = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;

      const { data, error } = await supabase
        .from('appointments')
        .select('id, date, time_slot, status, class_schedule_id, checkin_at')
        .eq('student_id', user.id)
        .in('status', ['confirmed', 'pending'])
        .gte('date', todayStr)
        .order('date', { ascending: true })
        .order('time_slot', { ascending: true })
        .limit(5);

      if (error || !data || data.length === 0) return null;

      const upcoming = data.filter((a) => {
        if (a.date > todayStr) return true;
        return a.time_slot >= nowTime;
      });

      if (upcoming.length === 0) return null;

      const appt = upcoming[0];

      if (appt.class_schedule_id) {
        const { data: schedule } = await supabase
          .from('class_schedules')
          .select('class_name')
          .eq('id', appt.class_schedule_id)
          .single();
        return { ...appt, className: schedule?.class_name || 'Treino' };
      }

      return { ...appt, className: 'Treino' };
    },
    enabled: !!user?.id && !!profile?.business_owner_id,
  });

  const { data: pendingQuestionnaires } = useQuery({
    queryKey: ['pending-questionnaires', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('sent_questionnaires')
        .select('id, type, created_at')
        .eq('student_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
  });

  if (profile && !profile.business_owner_id) {
    return <StudioLinkCard />;
  }

  // Full-screen onboarding takes over the dashboard so nothing renders behind it.
  if (showOnboarding) {
    return (
      <StudentOnboardingFlow
        startStep={onboardingStartStep}
        onCompleted={() => {
          // Profile refresh inside the flow toggles the flags off.
        }}
      />
    );
  }

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return format(date, "EEEE, dd 'de' MMMM", { locale: ptBR });
  };

  const handleCheckin = async () => {
    if (!nextAppointment || !user) return;
    setCheckingIn(true);
    const { error } = await supabase
      .from('appointments')
      .update({ checkin_at: new Date().toISOString() })
      .eq('id', nextAppointment.id);
    setCheckingIn(false);
    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível fazer check-in.', variant: 'destructive' });
      return;
    }
    toast({ title: '📍 Check-in realizado!', description: 'Aguarde a validação do seu professor.' });
    queryClient.invalidateQueries({ queryKey: ['next-appointment'] });
  };

  return (
    <div className="flex flex-col gap-4 animate-fade-in pb-24">
      {/* a) Welcome */}
      <div className="space-y-1 mb-2">
        <h1 className="text-2xl font-bold text-slate-900">
          Olá, {profile?.name?.split(' ')[0] || 'Aluno'}! 👋
        </h1>
        <p className="text-sm text-slate-500">
          Pronto para mais um treino?
        </p>
      </div>

      {/* b) Quick Action CTA — Agendar Novo Treino (flat, minimal) */}
      <Link
        to="/dashboard/agendar"
        className="w-full inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl py-3 px-4 transition-all active:scale-[0.99]"
      >
        <Dumbbell className="w-5 h-5" />
        Agendar Novo Treino
        <ArrowRight className="w-4 h-4" />
      </Link>

      {/* c) Next Class + Check-in */}
      {!isLoading && (
        nextAppointment ? (
          <Card className="bg-white border border-slate-100 shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-orange-500 mb-3">
                Próximo Treino
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                  <Calendar className="w-6 h-6 text-orange-500" />
                </div>
                <div className="min-w-0">
                  <p className="font-display text-lg text-foreground truncate">
                    {nextAppointment.className}
                  </p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {formatDate(nextAppointment.date)} · {nextAppointment.time_slot}
                  </p>
                </div>
              </div>
              {(() => {
                const now = new Date();
                const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                if (nextAppointment.date !== todayStr) return null;
                const [h, m] = nextAppointment.time_slot.split(':').map(Number);
                const classTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
                const diffMin = (classTime.getTime() - now.getTime()) / 60000;
                if (diffMin > 30 || diffMin < -15) return null;
                const alreadyCheckedIn = !!(nextAppointment as any).checkin_at;
                if (alreadyCheckedIn) {
                  return (
                    <div className="mt-4 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 py-3 rounded-xl font-bold text-center text-sm border border-emerald-200 dark:border-emerald-800/40">
                      ✅ Check-in realizado! Aguarde validação.
                    </div>
                  );
                }
                return (
                  <button
                    onClick={handleCheckin}
                    disabled={checkingIn}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-xl font-bold text-lg flex justify-center items-center gap-2 mt-4 transition-colors"
                  >
                    <MapPin className="w-5 h-5" />
                    Fazer Check-in no Estúdio
                  </button>
                );
              })()}
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-white border border-slate-100 shadow-sm border-dashed">
            <CardContent className="p-5 text-center">
              <Clock className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                Você não tem treinos agendados. Bora treinar? 💪
              </p>
            </CardContent>
          </Card>
        )
      )}

      {/* d) Ofensiva */}
      <StreakBadge />

      {/* e) Tarefas Pendentes do Personal */}
      {pendingQuestionnaires && pendingQuestionnaires.length > 0 && (
        <Card className="bg-white border border-slate-100 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                <ClipboardList className="w-3.5 h-3.5 text-amber-600" />
              </span>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Avisos do Personal
              </p>
            </div>
            <div className="divide-y divide-slate-100">
              {pendingQuestionnaires.map((q) => (
                <div key={q.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <p className="text-sm text-foreground flex-1">
                    Avaliação <strong className="font-semibold">{q.type === 'PAR-Q' ? 'PAR-Q+' : q.type === 'HOOPER' ? 'Índice de Hooper' : q.type}</strong> pendente
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 border-slate-200 text-orange-600 hover:bg-orange-50"
                    onClick={() => setSelectedQuestionnaire({ id: q.id, type: q.type })}
                  >
                    Responder
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* f) Mural de Avisos */}
      <AnnouncementsFeed />

      {/* Hidden Active Workout drawer trigger (opened via BottomNav event) */}
      <div className="hidden">
        <ActiveWorkoutCard />
      </div>

      {/* PSE Post-Workout Feedback */}
      <PSEFeedbackModal
        open={pseOpen}
        onOpenChange={setPseOpen}
        onSubmit={(score) => {
          console.log('PSE score:', score);
        }}
      />

      {/* Questionnaire Answering Modal */}
      <QuestionnaireModal
        open={!!selectedQuestionnaire}
        onOpenChange={(open) => { if (!open) setSelectedQuestionnaire(null); }}
        questionnaire={selectedQuestionnaire}
      />
    </div>
  );
}
