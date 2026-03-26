import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Flame, Share2 } from 'lucide-react';
import { startOfWeek, endOfWeek, format } from 'date-fns';
import { EvolutionHub } from './EvolutionHub';

export function StreakBadge() {
  const { profile, user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  const { data: weeklyCount } = useQuery({
    queryKey: ['weekly-completed', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const now = new Date();
      const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const { count } = await supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', user.id)
        .eq('status', 'completed')
        .gte('date', weekStart)
        .lte('date', weekEnd);
      return count || 0;
    },
    enabled: !!user?.id,
  });

  const streak = (profile as any)?.current_streak ?? 0;

  return (
    <>
      <Card className="border-accent/20 bg-gradient-to-r from-accent/10 to-amber-500/10 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-accent/20 shrink-0">
              <Flame className="w-7 h-7 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold text-foreground">
                {streak > 0 ? `🔥 ${streak} Semana${streak > 1 ? 's' : ''} Seguida${streak > 1 ? 's' : ''}!` : 'Comece sua ofensiva!'}
              </p>
              <p className="text-xs text-muted-foreground">
                Meta semanal: {weeklyCount ?? 0} aula{(weeklyCount ?? 0) !== 1 ? 's' : ''} concluída{(weeklyCount ?? 0) !== 1 ? 's' : ''} esta semana
              </p>
            </div>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="mt-4 bg-accent hover:bg-accent/90 text-accent-foreground px-4 py-2 rounded-lg font-bold text-sm w-full flex justify-center items-center gap-2 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            Compartilhar Ofensiva
          </button>
        </CardContent>
      </Card>
      <EvolutionHub open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}