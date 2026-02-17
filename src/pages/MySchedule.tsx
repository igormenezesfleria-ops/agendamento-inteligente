import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, User, Clock, Inbox } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function MySchedule() {
  const { user, profile } = useAuth();

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['my-schedule', user?.id],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data: appts, error } = await supabase
        .from('appointments')
        .select('id, date, time_slot, status, student_id')
        .eq('instructor_id', user!.id)
        .in('status', ['confirmed', 'delegated'])
        .gte('date', today)
        .order('date')
        .order('time_slot');

      if (error) throw error;
      if (!appts || appts.length === 0) return [];

      const studentIds = [...new Set(appts.map((a) => a.student_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', studentIds);

      const map = new Map((profiles || []).map((p) => [p.id, p.name]));

      return appts.map((a) => ({
        ...a,
        studentName: map.get(a.student_id) || 'Aluno',
      }));
    },
    enabled: !!user?.id,
  });

  const title = profile?.role === 'admin' ? 'Minha Agenda' : 'Meus Treinos';

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="space-y-2">
          <h1 className="font-display text-3xl text-foreground">{title}</h1>
          <p className="text-muted-foreground">
            Seus próximos treinos confirmados.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : !appointments || appointments.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
              <Inbox className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">Nenhum treino confirmado nos próximos dias.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map((appt: any) => (
              <Card key={appt.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{appt.studentName}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span className="capitalize">
                        {format(parseISO(appt.date), "EEEE, d MMM", { locale: ptBR })}
                      </span>
                      <span>• {appt.time_slot}</span>
                    </div>
                  </div>
                  <Badge variant={appt.status === 'confirmed' ? 'confirmed' : 'secondary'}>
                    {appt.status === 'confirmed' ? 'Confirmado' : 'Delegado'}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
