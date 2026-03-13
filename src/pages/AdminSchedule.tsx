import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DateSelector } from '@/components/booking/DateSelector';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Clock, User, Inbox, Pin, ListOrdered } from 'lucide-react';
import { format, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { STATUS_LABELS } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface SlotDetail {
  classSlot: any;
  appointments: any[];
  fixedStudents: any[];
  waitlistStudents: any[];
  instructorName: string | null;
}

export default function AdminSchedule() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SlotDetail | null>(null);

  const formattedDate = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;
  const dayOfWeek = selectedDate ? getDay(selectedDate) : null;

  // Fetch class_schedules for this day
  const { data: classSlots } = useQuery({
    queryKey: ['admin-class-slots', user?.id, dayOfWeek],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_schedules')
        .select('*')
        .eq('instructor_id', user!.id)
        .eq('day_of_week', dayOfWeek!)
        .order('start_time');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && dayOfWeek !== null,
  });

  // Fetch appointments for the selected date
  const { data: appointments, isLoading } = useQuery({
    queryKey: ['admin-schedule', formattedDate],
    queryFn: async () => {
      if (!formattedDate) return [];
      const { data: appts, error } = await supabase
        .from('appointments')
        .select('id, date, time_slot, status, student_id, instructor_id, class_schedule_id')
        .eq('date', formattedDate)
        .in('status', ['pending', 'confirmed', 'delegated'])
        .order('time_slot', { ascending: true });
      if (error) throw error;
      if (!appts || appts.length === 0) return [];

      const studentIds = [...new Set(appts.map((a) => a.student_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', studentIds);
      const profileMap = new Map((profiles || []).map((p) => [p.id, p.name || 'Aluno']));

      return appts.map((a) => ({
        ...a,
        studentName: profileMap.get(a.student_id) || 'Aluno',
      }));
    },
    enabled: !!formattedDate,
  });

  // Fetch fixed students for this day
  const { data: fixedStudents } = useQuery({
    queryKey: ['admin-fixed-day', user?.id, dayOfWeek],
    queryFn: async () => {
      if (!user?.id || dayOfWeek === null) return [];
      const { data, error } = await supabase
        .from('recurring_student_schedules')
        .select('student_id, class_schedule_id, time_slot')
        .eq('business_owner_id', user.id)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true);
      if (error) throw error;
      if (!data || data.length === 0) return [];

      const sIds = [...new Set(data.map((d) => d.student_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', sIds);
      const pMap = new Map((profiles || []).map((p) => [p.id, p.name || 'Aluno']));

      return data.map((d) => ({ ...d, studentName: pMap.get(d.student_id) || 'Aluno' }));
    },
    enabled: !!user?.id && dayOfWeek !== null,
  });

  // Fetch waitlist entries for selected date
  const { data: waitlistEntries } = useQuery({
    queryKey: ['admin-waitlist', formattedDate],
    queryFn: async () => {
      if (!formattedDate) return [];
      const { data, error } = await supabase
        .from('waitlist')
        .select('id, class_schedule_id, student_id, status, created_at')
        .eq('date', formattedDate)
        .eq('status', 'waiting')
        .order('created_at');
      if (error) throw error;
      if (!data || data.length === 0) return [];

      const sIds = [...new Set(data.map(d => d.student_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', sIds);
      const pMap = new Map((profiles || []).map(p => [p.id, p.name || 'Aluno']));
      return data.map(d => ({ ...d, studentName: pMap.get(d.student_id) || 'Aluno' }));
    },
    enabled: !!formattedDate,
  });

  // Fetch collaborator profiles for instructor names
  const { data: collaboratorProfiles } = useQuery({
    queryKey: ['collaborator-profiles', user?.id],
    queryFn: async () => {
      const collabIds = classSlots
        ?.map((s) => s.default_collaborator_id)
        .filter(Boolean) as string[];
      if (!collabIds || collabIds.length === 0) return new Map<string, string>();
      const { data } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', collabIds);
      return new Map((data || []).map((p) => [p.id, p.name || 'Instrutor']));
    },
    enabled: !!classSlots && classSlots.length > 0,
  });

  const handleSlotClick = (slot: any) => {
    const slotKey = slot.start_time?.slice(0, 5) || '';
    const slotAppts = appointments?.filter((a: any) =>
      a.class_schedule_id === slot.id || a.time_slot === slotKey
    ) || [];
    const slotFixed = fixedStudents?.filter((f) =>
      f.class_schedule_id === slot.id || f.time_slot === slotKey
    ) || [];
    const slotWaitlist = waitlistEntries?.filter((w) =>
      w.class_schedule_id === slot.id
    ) || [];
    const instructorName = slot.default_collaborator_id
      ? collaboratorProfiles?.get(slot.default_collaborator_id) || null
      : null;

    setSelectedSlot({
      classSlot: slot,
      appointments: slotAppts,
      fixedStudents: slotFixed,
      waitlistStudents: slotWaitlist,
      instructorName,
    });
  };

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
            Selecione uma data para visualizar os horários e alunos.
          </p>
        </div>

        <DateSelector selectedDate={selectedDate} onSelectDate={setSelectedDate} />

        {selectedDate && (
          <div className="space-y-4">
            <h3 className="font-display text-lg text-foreground">
              Horários — {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
            </h3>

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
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {classSlots.map((slot) => {
                  const slotKey = slot.start_time?.slice(0, 5) || '';
                  const slotAppts = appointments?.filter((a: any) =>
                    a.class_schedule_id === slot.id || a.time_slot === slotKey
                  ) || [];
                  const slotFixed = fixedStudents?.filter((f) =>
                    f.class_schedule_id === slot.id || f.time_slot === slotKey
                  ) || [];
                  const enrolled = slotAppts.length;
                  const fixedCount = slotFixed.length;

                  return (
                    <Card
                      key={slot.id}
                      className={cn(
                        'cursor-pointer transition-all hover:border-accent/50 hover:shadow-md',
                        enrolled > 0 && 'border-accent/30'
                      )}
                      onClick={() => handleSlotClick(slot)}
                    >
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium text-foreground">
                              {slotKey} - {slot.end_time?.slice(0, 5)}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {enrolled}/{slot.capacity}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{slot.class_name}</p>
                        {fixedCount > 0 && (
                          <div className="flex items-center gap-1 text-xs text-accent">
                            <Pin className="w-3 h-3" />
                            <span>{fixedCount} fixo(s)</span>
                          </div>
                        )}
                        {enrolled > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {slotAppts.slice(0, 3).map((a: any) => (
                              <Badge key={a.id} variant={statusVariant(a.status) as any} className="text-[10px]">
                                {a.studentName}
                              </Badge>
                            ))}
                            {slotAppts.length > 3 && (
                              <Badge variant="outline" className="text-[10px]">
                                +{slotAppts.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Slot detail modal */}
        <Dialog open={!!selectedSlot} onOpenChange={(open) => !open && setSelectedSlot(null)}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedSlot?.classSlot?.class_name} — {selectedSlot?.classSlot?.start_time?.slice(0, 5)} - {selectedSlot?.classSlot?.end_time?.slice(0, 5)}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              {/* Instructor */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="w-4 h-4" />
                <span>
                  Instrutor: <span className="font-medium text-foreground">
                    {selectedSlot?.instructorName || 'Você (Admin)'}
                  </span>
                </span>
              </div>

              {/* Capacity */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>
                  Vagas: {selectedSlot?.appointments.length || 0}/{selectedSlot?.classSlot?.capacity}
                </span>
              </div>

              {/* Fixed students */}
              {selectedSlot && selectedSlot.fixedStudents.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <Pin className="w-3.5 h-3.5 text-accent" />
                    Alunos Fixos
                  </p>
                  {selectedSlot.fixedStudents.map((f, i) => {
                    const hasAppt = selectedSlot.appointments.some((a: any) => a.student_id === f.student_id);
                    return (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-accent/5">
                        <span className="text-sm text-foreground">{f.studentName}</span>
                        <Badge variant={hasAppt ? 'confirmed' : 'outline'} className="text-xs">
                          {hasAppt ? 'Agendado' : 'Aguardando geração'}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Enrolled students */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Alunos Agendados</p>
                {!selectedSlot?.appointments.length ? (
                  <p className="text-sm text-muted-foreground">Nenhum aluno agendado.</p>
                ) : (
                  selectedSlot.appointments.map((appt: any) => {
                    const isFixed = selectedSlot.fixedStudents.some((f) => f.student_id === appt.student_id);
                    return (
                      <div key={appt.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-sm text-foreground">{appt.studentName}</span>
                          {isFixed && (
                            <span className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-full font-medium">
                              📌 Fixo
                            </span>
                          )}
                        </div>
                        <Badge variant={statusVariant(appt.status) as any} className="text-xs">
                          {STATUS_LABELS[appt.status] || appt.status}
                        </Badge>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Waitlist */}
              {selectedSlot && selectedSlot.waitlistStudents.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <ListOrdered className="w-3.5 h-3.5 text-orange-500" />
                    Fila de Espera ({selectedSlot.waitlistStudents.length})
                  </p>
                  {selectedSlot.waitlistStudents.map((w: any, i: number) => (
                    <div key={w.id} className="flex items-center justify-between p-2 rounded-lg bg-orange-500/5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-orange-500 w-5">{i + 1}º</span>
                        <span className="text-sm text-foreground">{w.studentName}</span>
                      </div>
                      <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                        Aguardando
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
