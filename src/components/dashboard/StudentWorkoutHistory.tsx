import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, Inbox } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';

export function StudentWorkoutHistory() {
  const { user } = useAuth();

  const { data: history, isLoading } = useQuery({
    queryKey: ['student-workout-history', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('appointments')
        .select('id, date, time_slot, status, attendance')
        .eq('student_id', user.id)
        .or('status.eq.completed,attendance.eq.present,attendance.eq.absent')
        .order('date', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const displayItems = history?.slice(0, 3) ?? [];
  const hasMore = (history?.length ?? 0) > 3;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="w-5 h-5 text-accent" />
          Histórico de Treinos
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
          </div>
        ) : displayItems.length === 0 ? (
          <div className="text-center py-6">
            <Inbox className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum treino registrado ainda.</p>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
            {displayItems.map((item) => {
              const dateObj = parseISO(item.date + 'T12:00:00');
              const formattedDate = format(dateObj, "d MMM yyyy", { locale: ptBR });
              return (
                <div key={item.id} className="flex items-center justify-between py-3 px-4 border-b border-border/30 last:border-0">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground capitalize">{formattedDate}</span>
                    <span className="text-xs text-muted-foreground">{item.time_slot}</span>
                  </div>
                  {item.attendance === 'present' && <Badge variant="confirmed">Presente</Badge>}
                  {item.attendance === 'absent' && <Badge variant="destructive">Faltou</Badge>}
                  {(!item.attendance || item.attendance === 'pending') && <Badge variant="outline">Concluído</Badge>}
                </div>
              );
            })}
            {hasMore && (
              <Link
                to="/dashboard/historico-treinos"
                className="block w-full text-center py-3 border-t border-border/30 text-accent font-semibold text-sm hover:text-accent/80 transition-colors"
              >
                Ver todo o histórico
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
