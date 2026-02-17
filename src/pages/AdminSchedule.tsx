import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Calendar as CalendarIcon, Clock, User, Inbox } from 'lucide-react';
import { format, addDays, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { STATUS_LABELS } from '@/lib/constants';
import { cn } from '@/lib/utils';

export default function AdminSchedule() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const dayOfWeek = getDay(selectedDate);

  // Fetch class_schedules for this day
  const { data: classSlots } = useQuery({
    queryKey: ['admin-class-slots', user?.id, dayOfWeek],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_schedules')
        .select('*')
        .eq('instructor_id', user!.id)
        .eq('day_of_week', dayOfWeek)
        .order('start_time');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['admin-schedule', dateStr],
    queryFn: async () => {
      const { data: appts, error: appError } = await supabase
        .from('appointments')
        .select('id, date, time_slot, status, student_id, instructor_id')
        .eq('date', dateStr)
        .in('status', ['pending', 'confirmed', 'delegated'])
        .order('time_slot', { ascending: true });

      if (appError) throw appError;
      if (!appts || appts.length === 0) return [];

      const studentIds = [...new Set(appts.map((a) => a.student_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', studentIds);

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

      return appts.map((a) => ({
        ...a,
        studentName: profileMap.get(a.student_id)?.name || 'Aluno',
      }));
    },
  });

  const statusVariant = (status: string) => {
    switch (status) {
      case 'confirmed': return 'confirmed';
      case 'pending': return 'pending';
      case 'delegated': return 'delegated';
      default: return 'outline';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="space-y-2">
          <h1 className="font-display text-3xl text-foreground">Agenda Completa</h1>
          <p className="text-muted-foreground">
            Visualize todos os agendamentos por data.
          </p>
        </div>

        {/* Date picker */}
        <div className="flex items-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="w-4 h-4" />
                <span className="capitalize">
                  {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && setSelectedDate(d)}
                disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0)) || d > addDays(new Date(), 31)}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Schedule grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : !classSlots || classSlots.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
              <Inbox className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">Nenhum horário configurado para este dia.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {classSlots.map((slot) => {
              const slotKey = slot.start_time?.slice(0, 5) || '';
              const slotAppointments = appointments?.filter(
                (a: any) => a.time_slot === slotKey
              ) || [];

              return (
                <Card key={slot.id} className={cn(slotAppointments.length > 0 && 'border-accent/30')}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">
                          {slotKey} - {slot.end_time?.slice(0, 5)}
                        </span>
                      </div>
                      <div className="flex-1">
                        {slotAppointments.length === 0 ? (
                          <span className="text-sm text-muted-foreground">Sem agendamentos</span>
                        ) : (
                          <div className="space-y-2">
                            {slotAppointments.map((appt: any) => (
                              <div key={appt.id} className="flex items-center gap-3">
                                <User className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm text-foreground">
                                  {appt.studentName}
                                </span>
                                <Badge variant={statusVariant(appt.status) as any}>
                                  {STATUS_LABELS[appt.status] || appt.status}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {slotAppointments.length}/{slot.capacity}
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
