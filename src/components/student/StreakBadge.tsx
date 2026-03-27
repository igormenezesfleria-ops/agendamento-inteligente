import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Flame, Share2, Trophy, Dumbbell, Activity, TrendingUp } from 'lucide-react';
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

  const { data: totalClasses } = useQuery({
    queryKey: ['total-completed', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count } = await supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', user.id)
        .eq('status', 'completed');
      return count || 0;
    },
    enabled: !!user?.id,
  });

  const streak = (profile as any)?.current_streak ?? 0;

  const stats = [
    { icon: Flame, label: 'Ofensiva', value: `${streak} sem` },
    { icon: Dumbbell, label: 'Aulas', value: `${totalClasses ?? 0} total` },
    { icon: Activity, label: 'PSE Média', value: '7' },
    { icon: TrendingUp, label: 'Média/Sem', value: `${weeklyCount ?? 0}` },
  ];

  return (
    <>
      <Card className="border-accent/20 bg-gradient-to-br from-accent/5 via-background to-accent/3 overflow-hidden">
        <CardContent className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-accent/15 shrink-0">
              <Flame className="w-7 h-7 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-extrabold text-foreground">
                {streak > 0 ? `🔥 ${streak} Semana${streak > 1 ? 's' : ''} Seguida${streak > 1 ? 's' : ''}!` : 'Comece sua ofensiva!'}
              </p>
              <p className="text-xs text-muted-foreground">
                {weeklyCount ?? 0} aula{(weeklyCount ?? 0) !== 1 ? 's' : ''} concluída{(weeklyCount ?? 0) !== 1 ? 's' : ''} esta semana
              </p>
            </div>
            {streak > 0 && (
              <Trophy className="w-5 h-5 text-amber-500 shrink-0" />
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-2">
            {stats.map((s) => (
              <div key={s.label} className="bg-card rounded-xl p-2.5 border border-border text-center space-y-1">
                <s.icon className="w-4 h-4 text-accent mx-auto" />
                <p className="text-xs font-bold text-foreground leading-tight">{s.value}</p>
                <p className="text-[9px] text-muted-foreground font-medium">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Share CTA */}
          <button
            onClick={() => setModalOpen(true)}
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground px-4 py-3 rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition-colors"
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