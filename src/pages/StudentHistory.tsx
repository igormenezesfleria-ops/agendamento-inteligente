import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, Clock, Inbox } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function StudentHistory() {
  const { user } = useAuth();

  const { data: history, isLoading } = useQuery({
    queryKey: ['student-full-history', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('appointments')
        .select('id, date, time_slot, status, attendance')
        .eq('student_id', user.id)
        .or('status.eq.completed,attendance.eq.present,attendance.eq.absent')
        .order('date', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="space-y-2">
          <h1 className="font-display text-3xl text-foreground">Histórico de Treinos</h1>
          <p className="text-muted-foreground">
            Veja seu histórico de treinos realizados e faltas.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : !history || history.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Inbox className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-display text-lg text-foreground mb-2">Nenhum treino registrado</h3>
            <p className="text-muted-foreground">Seu histórico de treinos aparecerá aqui.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{history.length} treino(s) no histórico</p>
            {history.map((item) => {
              const dateObj = parseISO(item.date + 'T12:00:00');
              const formattedDate = format(dateObj, "EEEE, d 'de' MMMM yyyy", { locale: ptBR });
              return (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground capitalize text-sm">{formattedDate}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3" />
                            {item.time_slot}
                          </span>
                        </div>
                      </div>
                      <div>
                        {item.attendance === 'present' && <Badge variant="confirmed">Presente</Badge>}
                        {item.attendance === 'absent' && <Badge variant="destructive">Faltou</Badge>}
                        {(!item.attendance || item.attendance === 'pending') && (
                          <Badge variant="outline">Concluído</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
