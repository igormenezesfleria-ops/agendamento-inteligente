import { useState } from 'react';
import { addHours, isAfter, parseISO } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AppointmentCard } from '@/components/appointments/AppointmentCard';
import { CANCELLATION_DEADLINE_HOURS } from '@/lib/constants';
import { toast } from 'sonner';
import { Loader2, Calendar } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function MyAppointments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['myAppointments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('appointments')
        .select('id, date, time_slot, status, student_id, instructor_id, attendance')
        .eq('student_id', user.id)
        .order('date', { ascending: true })
        .order('time_slot', { ascending: true });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Fetch instructor names for confirmed/completed appointments
      const instructorIds = [
        ...new Set(
          data
            .filter((a) => a.instructor_id && (a.status === 'confirmed' || a.status === 'completed'))
            .map((a) => a.instructor_id!)
        ),
      ];

      let instructorMap = new Map<string, string>();
      if (instructorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', instructorIds);

        instructorMap = new Map((profiles || []).map((p) => [p.id, p.name || 'Instrutor']));
      }

      return data.map((a) => ({
        ...a,
        instructorName: a.instructor_id ? instructorMap.get(a.instructor_id) || null : null,
      }));
    },
    enabled: !!user?.id,
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .eq('student_id', user?.id);

      if (updateError) {
        const { error: deleteError } = await supabase
          .from('appointments')
          .delete()
          .eq('id', id)
          .eq('student_id', user?.id);

        if (deleteError) throw deleteError;
      }
    },
    onSuccess: () => {
      toast.success('Agendamento cancelado com sucesso');
      queryClient.invalidateQueries({ queryKey: ['myAppointments'] });
      queryClient.invalidateQueries({ queryKey: ['slotCounts'] });
      setCancellingId(null);
    },
    onError: (error: any) => {
      console.error('Cancel error:', error);
      toast.error('Erro ao cancelar agendamento. Verifique se ainda está dentro do prazo.');
      setCancellingId(null);
    },
  });

  const handleCancel = (id: string) => {
    setCancellingId(id);
    cancelMutation.mutate(id);
  };

  const canCancel = (date: string, timeSlot: string) => {
    const appointmentDateTime = parseISO(date + 'T' + timeSlot + ':00');
    const deadline = addHours(new Date(), CANCELLATION_DEADLINE_HOURS);
    return isAfter(appointmentDateTime, deadline);
  };

  const upcomingAppointments = appointments?.filter(
    (apt) => apt.status !== 'cancelled' && apt.status !== 'completed'
  );

  const pastAppointments = appointments?.filter(
    (apt) => apt.status === 'completed' || apt.status === 'cancelled'
  );

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="space-y-2">
          <h1 className="font-display text-3xl text-foreground">Meus Agendamentos</h1>
          <p className="text-muted-foreground">
            Acompanhe o status dos seus treinos agendados.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : (
          <Tabs defaultValue="upcoming" className="space-y-6">
            <TabsList>
              <TabsTrigger value="upcoming">
                Próximos ({upcomingAppointments?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="past">
                Histórico ({pastAppointments?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="space-y-4">
              {upcomingAppointments?.length === 0 ? (
                <EmptyState />
              ) : (
                upcomingAppointments?.map((apt) => (
                  <AppointmentCard
                    key={apt.id}
                    id={apt.id}
                    date={apt.date}
                    timeSlot={apt.time_slot}
                    status={apt.status}
                    instructorName={apt.instructorName}
                    attendance={apt.attendance}
                    canCancel={canCancel(apt.date, apt.time_slot)}
                    isCancelling={cancellingId === apt.id}
                    onCancel={handleCancel}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="past" className="space-y-4">
              {pastAppointments?.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Nenhum histórico de agendamentos ainda.</p>
                </div>
              ) : (
                pastAppointments?.map((apt) => (
                  <AppointmentCard
                    key={apt.id}
                    id={apt.id}
                    date={apt.date}
                    timeSlot={apt.time_slot}
                    status={apt.status}
                    instructorName={apt.instructorName}
                    attendance={apt.attendance}
                    canCancel={false}
                    isCancelling={false}
                    onCancel={() => {}}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
        <Calendar className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="font-display text-lg text-foreground mb-2">
        Nenhum agendamento
      </h3>
      <p className="text-muted-foreground">
        Você ainda não tem treinos agendados. Que tal agendar um agora?
      </p>
    </div>
  );
}
