import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, Clock, Inbox } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
        ) : !history || history.length === 0 ? (
          <div className="text-center py-6">
            <Inbox className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum treino registrado ainda.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((item) => {
              const dateObj = parseISO(item.date + 'T12:00:00');
              const formattedDate = format(dateObj, "d MMM yyyy", { locale: ptBR });
              return (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col text-sm">
                      <span className="font-medium text-foreground capitalize">{formattedDate}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {item.time_slot}
                      </span>
                    </div>
                  </div>
                  {item.attendance === 'present' && <Badge variant="confirmed">Presente</Badge>}
                  {item.attendance === 'absent' && <Badge variant="destructive">Faltou</Badge>}
                  {!item.attendance || item.attendance === 'pending' ? (
                    <Badge variant="outline">Concluído</Badge>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
