import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, Clock, User, Inbox } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TIME_SLOTS, STATUS_LABELS } from '@/lib/constants';

export default function AdminHistory() {
  const { data: history, isLoading } = useQuery({
    queryKey: ['admin-history'],
    queryFn: async () => {
      const { data: appointments, error: appError } = await supabase
        .from('appointments')
        .select('id, date, time_slot, status, student_id, instructor_id, completed_at')
        .in('status', ['completed', 'cancelled', 'rejected'])
        .order('date', { ascending: false })
        .limit(100);

      if (appError) throw appError;
      if (!appointments || appointments.length === 0) return [];

      const studentIds = [...new Set(appointments.map((a) => a.student_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', studentIds);

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

      return appointments.map((a) => ({
        ...a,
        studentName: profileMap.get(a.student_id)?.name || 'Aluno',
      }));
    },
  });

  const statusVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'cancelled': return 'destructive';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="space-y-2">
          <h1 className="font-display text-3xl text-foreground">Histórico</h1>
          <p className="text-muted-foreground">
            Treinos concluídos, cancelados e recusados.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : history?.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Inbox className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-display text-lg text-foreground mb-2">Sem histórico</h3>
            <p className="text-muted-foreground">Nenhum treino finalizado ainda.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history?.map((item: any) => {
              const slot = TIME_SLOTS.find((s) => s.id === item.time_slot);
              const formattedDate = format(
                parseISO(item.date + 'T12:00:00'),
                "d 'de' MMMM, yyyy",
                { locale: ptBR }
              );

              return (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-accent" />
                          <span className="font-semibold text-foreground">
                            {item.studentName}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{formattedDate}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{slot?.label || item.time_slot}</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant={statusVariant(item.status) as any}>
                        {STATUS_LABELS[item.status] || item.status}
                      </Badge>
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
