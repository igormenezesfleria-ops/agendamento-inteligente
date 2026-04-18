import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ClipboardList } from 'lucide-react';
import { AnnouncementsFeed } from '@/components/dashboard/AnnouncementsFeed';
import { StudioLinkCard } from '@/components/student/StudioLinkCard';

import { ActiveWorkoutCard } from '@/components/student/ActiveWorkoutCard';
import { StreakBadge } from '@/components/student/StreakBadge';
import { TriageModal } from '@/components/student/TriageModal';
import { QuestionnaireModal } from '@/components/student/QuestionnaireModal';
import { LiabilityWaiverOverlay } from '@/components/student/LiabilityWaiverOverlay';
import { PSEFeedbackModal } from '@/components/student/PSEFeedbackModal';

export function StudentDashboard() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [triageOpen, setTriageOpen] = useState(false);
  const [liabilityOpen, setLiabilityOpen] = useState(false);
  const [pseOpen, setPseOpen] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<{ id: string; type: string } | null>(null);

  useEffect(() => {
    if (profile && profile.business_owner_id) {
      // Show liability waiver first if not accepted
      if (!(profile as any).liability_accepted) {
        setLiabilityOpen(true);
      } else if (profile.profile_completed === false) {
        setTriageOpen(true);
      }
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
        .select('id, date, time_slot, status, class_schedule_id, checkin_at')
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
    <div className="space-y-6 animate-fade-in pb-24">
      {/* Pending Tasks from Personal Trainer */}
      {pendingQuestionnaires && pendingQuestionnaires.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <ClipboardList className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                Avisos do Personal
              </p>
            </div>
            <div className="divide-y divide-amber-200/60 dark:divide-amber-900/30">
              {pendingQuestionnaires.map((q) => (
                <div key={q.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <p className="text-sm text-foreground flex-1">
                    Avaliação <strong className="font-semibold">{q.type === 'PAR-Q' ? 'PAR-Q+' : q.type === 'HOOPER' ? 'Índice de Hooper' : q.type}</strong> pendente
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 border-amber-400/60 text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/30"
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

      {/* a) Welcome */}
      <div className="space-y-1">
        <h1 className="font-display text-3xl text-foreground">
          Olá, {profile?.name?.split(' ')[0] || 'Aluno'}! 👋
        </h1>
        <p className="text-muted-foreground">
          Pronto para mais um treino?
        </p>
      </div>

      {/* b) Gamification & Engagement — compact horizontal strip */}
      <StreakBadge />

      {/* c) Announcements */}
      <AnnouncementsFeed />

      {/* Active Workout drawer (hidden trigger — opened via BottomNav 'Treino' event) */}
      <div className="hidden">
        <ActiveWorkoutCard />
      </div>

      {/* Triage Onboarding Modal */}
      <TriageModal open={triageOpen} onOpenChange={setTriageOpen} />

      {/* Liability Waiver Overlay */}
      <LiabilityWaiverOverlay
        open={liabilityOpen}
        onAccepted={() => {
          setLiabilityOpen(false);
          // After liability accepted, check if triage needed
          if (profile && profile.profile_completed === false) {
            setTriageOpen(true);
          }
        }}
      />

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
