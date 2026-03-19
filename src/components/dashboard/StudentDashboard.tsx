import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock, ArrowRight, Dumbbell, AlertTriangle } from 'lucide-react';
import { AnnouncementsFeed } from '@/components/dashboard/AnnouncementsFeed';
import { StudioLinkCard } from '@/components/student/StudioLinkCard';
import { StudentWorkoutHistory } from '@/components/dashboard/StudentWorkoutHistory';
import { PerformanceReceipt } from '@/components/student/PerformanceReceipt';
import { ActiveWorkoutCard } from '@/components/student/ActiveWorkoutCard';
import { StreakBadge } from '@/components/student/StreakBadge';
import { TriageModal } from '@/components/student/TriageModal';
import { QuestionnaireModal } from '@/components/student/QuestionnaireModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function StudentDashboard() {
  const { profile, user } = useAuth();
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [triageOpen, setTriageOpen] = useState(false);
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<{ id: string; type: string } | null>(null);

  useEffect(() => {
    if (profile && profile.profile_completed === false && profile.business_owner_id) {
      setTriageOpen(true);
    }
  }, [profile]);

  const { data: nextAppointment, isLoading } = useQuery({
    queryKey: ['next-appointment', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const nowTime = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;

      // Fetch upcoming confirmed/pending appointments
      const { data, error } = await supabase
        .from('appointments')
        .select('id, date, time_slot, status, class_schedule_id')
        .eq('student_id', user.id)
        .in('status', ['confirmed', 'pending'])
        .gte('date', todayStr)
        .order('date', { ascending: true })
        .order('time_slot', { ascending: true })
        .limit(5);

      if (error || !data || data.length === 0) return null;

      // Filter out past slots for today
      const upcoming = data.filter((a) => {
        if (a.date > todayStr) return true;
        return a.time_slot >= nowTime;
      });

      if (upcoming.length === 0) return null;

      const appt = upcoming[0];

      // Fetch class name
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

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return format(date, "EEEE, dd 'de' MMMM", { locale: ptBR });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Pending Questionnaire Alert */}
      {pendingQuestionnaires && pendingQuestionnaires.length > 0 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-4 space-y-3">
            {pendingQuestionnaires.map((q) => (
              <div key={q.id} className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
                <p className="text-sm font-medium flex-1">
                  Aviso: Seu Personal enviou uma avaliação <strong>{q.type === 'PAR-Q' ? 'PAR-Q+' : q.type === 'HOOPER' ? 'Índice de Hooper' : q.type}</strong> para você.
                </p>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setSelectedQuestionnaire({ id: q.id, type: q.type })}
                >
                  Responder Agora
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* a) Welcome */}
      <div className="space-y-1">
        <h1 className="font-display text-3xl text-foreground">
          Olá, {profile?.name?.split(' ')[0] || 'Aluno'}! 👋
        </h1>
        <p className="text-muted-foreground">
          Pronto para mais um treino?
        </p>
      </div>

      {/* b) Quick Action CTA */}
      <Button asChild variant="accent" size="lg" className="w-full">
        <Link to="/dashboard/agendar">
          <Dumbbell className="w-5 h-5 mr-2" />
          Agendar Novo Treino
          <ArrowRight className="w-4 h-4 ml-2" />
        </Link>
      </Button>

      {/* c) Next Class */}
      {!isLoading && (
        nextAppointment ? (
          <Card className="border-accent/30 bg-accent/5">
            <CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-accent mb-3">
                Próximo Treino
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl accent-gradient flex items-center justify-center shrink-0">
                  <Calendar className="w-6 h-6 text-accent-foreground" />
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
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-5 text-center">
              <Clock className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                Você não tem treinos agendados. Bora treinar? 💪
              </p>
            </CardContent>
          </Card>
        )
      )}

      {/* d) Active Workout */}
      <ActiveWorkoutCard />

      {/* e) Gamification & Engagement */}
      <StreakBadge />

      {/* f) Announcements */}
      <AnnouncementsFeed />

      {/* g) Workout History */}
      <StudentWorkoutHistory />

      {/* Receipt Modal */}
      <PerformanceReceipt open={receiptOpen} onOpenChange={setReceiptOpen} />

      {/* Triage Onboarding Modal */}
      <TriageModal open={triageOpen} onOpenChange={setTriageOpen} />

      {/* Questionnaire Answering Modal */}
      <QuestionnaireModal
        open={!!selectedQuestionnaire}
        onOpenChange={(open) => { if (!open) setSelectedQuestionnaire(null); }}
        questionnaire={selectedQuestionnaire}
      />
    </div>
  );
}
