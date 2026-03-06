import { useState } from 'react';
import { format, isAfter, addHours, getDay } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DateSelector } from '@/components/booking/DateSelector';
import { SlotCard } from '@/components/booking/SlotCard';
import { toast } from 'sonner';
import { Loader2, Inbox } from 'lucide-react';

export default function Booking() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [bookingSlot, setBookingSlot] = useState<string | null>(null);

  const formattedDate = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;
  const dayOfWeek = selectedDate ? getDay(selectedDate) : null;
  const trainerId = profile?.business_owner_id;

  // 1. Fetch class_schedules for the trainer matching the selected day
  const { data: classSlots, isLoading: isLoadingSlots } = useQuery({
    queryKey: ['class-slots', trainerId, dayOfWeek],
    queryFn: async () => {
      if (!trainerId || dayOfWeek === null) return [];
      const { data, error } = await supabase
        .from('class_schedules')
        .select('*')
        .eq('instructor_id', trainerId)
        .eq('day_of_week', dayOfWeek)
        .order('start_time');
      if (error) throw error;
      return data || [];
    },
    enabled: !!trainerId && dayOfWeek !== null,
  });

  // 2. Fetch existing appointments for the selected date (global capacity + visibility)
  // CAPACITY: counts ALL rows (pending + confirmed + delegated)
  // VISIBILITY: only confirmed/delegated/fixed names are shown (filtered separately)
  const { data: dateAppointments, isLoading: isLoadingCounts } = useQuery({
    queryKey: ['dateAppointments', formattedDate],
    queryFn: async () => {
      if (!formattedDate) return [];
      const { data, error } = await supabase
        .from('appointments')
        .select('time_slot, class_schedule_id, student_id, status')
        .eq('date', formattedDate)
        .in('status', ['pending', 'confirmed', 'delegated']);
      if (error) throw error;
      return data || [];
    },
    enabled: !!formattedDate,
    refetchInterval: 10000, // Poll every 10s for real-time capacity sync
  });

  // Derive slot counts from dateAppointments
  const slotCounts = (() => {
    const counts: Record<string, number> = {};
    dateAppointments?.forEach((apt) => {
      const key = apt.class_schedule_id || apt.time_slot;
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  })();

  // 3. Fetch ALL fixed students for this trainer + dayOfWeek (for capacity math)
  const { data: allFixedForDay } = useQuery({
    queryKey: ['allFixedForDay', trainerId, dayOfWeek],
    queryFn: async () => {
      if (!trainerId || dayOfWeek === null) return [];
      const { data, error } = await supabase
        .from('recurring_student_schedules')
        .select('student_id, class_schedule_id, time_slot')
        .eq('business_owner_id', trainerId)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!trainerId && dayOfWeek !== null,
    refetchInterval: 10000, // Poll for real-time capacity sync
  });

  // 4. VISIBILITY ONLY: Fetch classmate profiles (confirmed/delegated/fixed names shown, pending stays anonymous)
  const allRelevantStudentIds = [
    ...new Set([
      ...(dateAppointments || [])
        .filter((a) => a.status === 'confirmed' || a.status === 'delegated' || a.status === 'pending')
        .map((a) => a.student_id),
      ...(allFixedForDay || []).map((f) => f.student_id),
    ].filter((id) => id !== user?.id)),
  ];

  const { data: classmateProfiles } = useQuery({
    queryKey: ['classmateProfiles', allRelevantStudentIds.sort().join(',')],
    queryFn: async () => {
      if (allRelevantStudentIds.length === 0) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', allRelevantStudentIds);
      if (error) throw error;
      return data || [];
    },
    enabled: allRelevantStudentIds.length > 0,
  });

  // Build classmate names for a slot (appointments + fixed students without duplicates)
  const getClassmateNames = (classId: string, timeSlot: string): string[] => {
    const profileMap = new Map((classmateProfiles || []).map((p) => [p.id, p.name || 'Aluno']));
    const seen = new Set<string>();
    const names: string[] = [];

    // From active appointments
    (dateAppointments || []).forEach((a) => {
      if (
        (a.class_schedule_id === classId || a.time_slot === timeSlot) &&
        (a.status === 'confirmed' || a.status === 'delegated') &&
        a.student_id !== user?.id &&
        !seen.has(a.student_id)
      ) {
        seen.add(a.student_id);
        const name = profileMap.get(a.student_id);
        if (name) names.push(name);
      }
    });

    // From fixed students not yet in appointments
    (allFixedForDay || []).forEach((f) => {
      if (
        (f.class_schedule_id === classId || f.time_slot === timeSlot) &&
        f.student_id !== user?.id &&
        !seen.has(f.student_id)
      ) {
        seen.add(f.student_id);
        const name = profileMap.get(f.student_id);
        if (name) names.push(name);
      }
    });

    return names;
  };

  // 5. Fetch THIS student's fixed schedules for this day (for button state)
  const { data: myFixedSchedules } = useQuery({
    queryKey: ['myFixedSchedules', user?.id, trainerId, dayOfWeek],
    queryFn: async () => {
      if (!user?.id || !trainerId || dayOfWeek === null) return [];
      const { data, error } = await supabase
        .from('recurring_student_schedules')
        .select('class_schedule_id, time_slot')
        .eq('student_id', user.id)
        .eq('business_owner_id', trainerId)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && !!trainerId && dayOfWeek !== null,
  });

  // 6. Fetch locked slots
  const { data: lockedSlots } = useQuery({
    queryKey: ['lockedSlots', formattedDate],
    queryFn: async () => {
      if (!formattedDate) return [];
      const { data, error } = await supabase
        .from('locked_slots')
        .select('time_slot')
        .eq('date', formattedDate);
      if (error) throw error;
      return data?.map((s) => s.time_slot) || [];
    },
    enabled: !!formattedDate,
  });

  // 7. Fetch user's existing bookings for conflict detection
  const { data: userBookings } = useQuery({
    queryKey: ['userBookings', formattedDate, user?.id],
    queryFn: async () => {
      if (!formattedDate || !user?.id) return [];
      const { data, error } = await supabase
        .from('appointments')
        .select('time_slot, class_schedule_id')
        .eq('student_id', user.id)
        .eq('date', formattedDate)
        .neq('status', 'cancelled');
      if (error) throw error;
      return data || [];
    },
    enabled: !!formattedDate && !!user?.id,
  });

  // --- Derived sets ---

  const myFixedClassIds = new Set(
    myFixedSchedules?.filter((s) => s.class_schedule_id).map((s) => s.class_schedule_id!) || []
  );
  const myFixedTimeSlots = new Set(
    myFixedSchedules?.map((s) => s.time_slot) || []
  );

  const bookedClassIds = new Set(
    userBookings?.filter((b) => b.class_schedule_id).map((b) => b.class_schedule_id!) || []
  );
  const bookedTimeSlots = new Set(
    userBookings?.map((b) => b.time_slot) || []
  );

  // Count of ALL fixed students per class_schedule_id (for capacity subtraction)
  const fixedCountByClassId: Record<string, number> = {};
  allFixedForDay?.forEach((s) => {
    const key = s.class_schedule_id || s.time_slot;
    fixedCountByClassId[key] = (fixedCountByClassId[key] || 0) + 1;
  });

  const isStudentFixed = (classId: string, timeSlot: string) =>
    myFixedClassIds.has(classId) || myFixedTimeSlots.has(timeSlot);

  const isSlotBooked = (classId: string, timeSlot: string) =>
    bookedClassIds.has(classId) || bookedTimeSlots.has(timeSlot);

  const hasTimeConflict = (startTime: string) => {
    const slotKey = startTime.slice(0, 5);
    return bookedTimeSlots.has(slotKey);
  };

  /**
   * Global capacity: availableSpots = maxCapacity - max(appointmentCount, totalFixed)
   * This ensures fixed students always reserve a spot even before their
   * appointment row is auto-generated.
   */
  const getEffectiveRemaining = (classId: string, maxCapacity: number) => {
    const appointmentCount = slotCounts?.[classId] || 0;
    const totalFixed = fixedCountByClassId[classId] || 0;
    const effectiveUsed = Math.max(appointmentCount, totalFixed);
    return maxCapacity - effectiveUsed;
  };

  const bookMutation = useMutation({
    mutationFn: async ({ timeSlot, classScheduleId }: { timeSlot: string; classScheduleId: string }) => {
      if (!user?.id || !formattedDate) throw new Error('Missing data');

      if (bookedTimeSlots.has(timeSlot)) {
        throw new Error('TIME_CONFLICT');
      }

      const matchingSlot = classSlots?.find(s => s.id === classScheduleId);
      const autoConfirm = matchingSlot && !matchingSlot.requires_approval;

      const insertData: any = {
        student_id: user.id,
        date: formattedDate,
        time_slot: timeSlot,
        class_schedule_id: classScheduleId,
        status: autoConfirm ? 'confirmed' : 'pending',
      };

      if (autoConfirm) {
        insertData.instructor_id = matchingSlot?.default_collaborator_id || trainerId;
      } else if (matchingSlot?.default_collaborator_id) {
        insertData.instructor_id = matchingSlot.default_collaborator_id;
      }

      const { error } = await supabase.from('appointments').insert(insertData);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Agendamento realizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['dateAppointments', formattedDate] });
      queryClient.invalidateQueries({ queryKey: ['userBookings', formattedDate, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['myAppointments'] });
      setBookingSlot(null);
    },
    onError: (error: any) => {
      if (error.message === 'TIME_CONFLICT') {
        toast.error('Você já possui um agendamento para este horário.');
      } else if (error.message?.includes('duplicate')) {
        toast.error('Você já tem um agendamento neste horário');
      } else {
        toast.error('Erro ao fazer agendamento. Tente novamente.');
      }
      setBookingSlot(null);
    },
  });

  const canBookSlot = (startTime: string, actionWindowHours?: number) => {
    if (!selectedDate) return false;
    const [hours, mins] = startTime.split(':').map(Number);
    const slotDateTime = new Date(selectedDate);
    slotDateTime.setHours(hours, mins || 0, 0, 0);
    const windowHours = actionWindowHours ?? 2;
    const deadline = addHours(new Date(), windowHours);
    return isAfter(slotDateTime, deadline);
  };

  const handleBook = (timeSlot: string, classScheduleId: string) => {
    if (bookedTimeSlots.has(timeSlot)) {
      toast.error('Você já possui um agendamento para este horário.');
      return;
    }
    const slot = classSlots?.find(s => s.id === classScheduleId);
    const windowHrs = slot?.action_window_hours ?? 2;
    if (!canBookSlot(timeSlot, windowHrs)) {
      toast.error(`O agendamento só pode ser feito com no mínimo ${windowHrs} horas de antecedência.`);
      return;
    }
    setBookingSlot(classScheduleId);
    bookMutation.mutate({ timeSlot, classScheduleId });
  };

  const isLoading = isLoadingSlots || isLoadingCounts;

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="space-y-2">
          <h1 className="font-display text-3xl text-foreground">Agendar Treino</h1>
          <p className="text-muted-foreground">
            Escolha uma data e horário disponível para seu próximo treino.
          </p>
        </div>

        <DateSelector selectedDate={selectedDate} onSelectDate={setSelectedDate} />

        {selectedDate && (
          <div className="space-y-4">
            <h3 className="font-display text-lg text-foreground">
              Horários Disponíveis - {format(selectedDate, "d 'de' MMMM")}
            </h3>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
              </div>
            ) : !classSlots || classSlots.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                  <Inbox className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm">
                  Nenhum horário disponível neste dia.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {classSlots.map((slot) => {
                  const slotKey = slot.start_time?.slice(0, 5) || '';
                  const classId = slot.id;
                  const fixed = isStudentFixed(classId, slotKey);
                  const booked = isSlotBooked(classId, slotKey);
                  const timeConflict = !booked && !fixed && hasTimeConflict(slotKey);
                  const effectiveRemaining = getEffectiveRemaining(classId, slot.capacity);

                  return (
                    <SlotCard
                      key={slot.id}
                      timeSlot={slotKey}
                      label={`${slot.class_name} · ${slotKey} - ${slot.end_time?.slice(0, 5)}`}
                      effectiveRemaining={effectiveRemaining}
                      maxCapacity={slot.capacity}
                      isLocked={lockedSlots?.includes(slotKey) || false}
                      isBooked={booked}
                      isFixed={fixed}
                      hasTimeConflict={timeConflict}
                      canBook={canBookSlot(slotKey, slot.action_window_hours)}
                      isLoading={bookingSlot === classId}
                      onBook={() => handleBook(slotKey, classId)}
                      actionWindowHours={slot.action_window_hours ?? 2}
                      classmateNames={getClassmateNames(classId, slotKey)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
