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
  const [triageOpen, setTriageOpen] = useState(false);
  const [liabilityOpen, setLiabilityOpen] = useState(false);
  const [pseOpen, setPseOpen] = useState(false);
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<{ id: string; type: string } | null>(null);

  useEffect(() => {
    if (profile && profile.business_owner_id) {
      if (!(profile as any).liability_accepted) {
        setLiabilityOpen(true);
      } else if (profile.profile_completed === false) {
        setTriageOpen(true);
      }
    }
  }, [profile]);

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
