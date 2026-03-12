import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Flame } from 'lucide-react';
import { startOfWeek, endOfWeek, format } from 'date-fns';

export function StreakBadge() {
  const { profile, user } = useAuth();

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
    <Card className="border-orange-500/20 bg-gradient-to-r from-orange-500/10 to-amber-500/10 overflow-hidden">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-orange-500/20">
          <Flame className="w-7 h-7 text-orange-500" />
        </div>
        <div className="flex-1">
          <p className="text-lg font-bold text-foreground">
            {streak > 0 ? `🔥 ${streak} Semana${streak > 1 ? 's' : ''} Seguida${streak > 1 ? 's' : ''}!` : 'Comece sua ofensiva!'}
          </p>
          <p className="text-xs text-muted-foreground">
            Meta semanal: {weeklyCount ?? 0} aula{(weeklyCount ?? 0) !== 1 ? 's' : ''} concluída{(weeklyCount ?? 0) !== 1 ? 's' : ''} esta semana
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
