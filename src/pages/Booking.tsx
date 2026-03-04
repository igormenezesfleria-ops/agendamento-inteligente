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

  // 2. Fetch existing appointments for the selected date (capacity + classmate names)
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

  // Fetch confirmed classmate names for each slot
  const confirmedStudentIds = [
    ...new Set(
      (dateAppointments || [])
        .filter((a) => a.status === 'confirmed' || a.status === 'delegated')
        .map((a) => a.student_id)
        .filter((id) => id !== user?.id)
    ),
  ];

  const { data: classmateProfiles } = useQuery({
    queryKey: ['classmateProfiles', confirmedStudentIds.sort().join(',')],
    queryFn: async () => {
      if (confirmedStudentIds.length === 0) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', confirmedStudentIds);
      if (error) throw error;
      return data || [];
    },
    enabled: confirmedStudentIds.length > 0,
  });

  // Build a map: classScheduleId -> classmate names
  const getClassmateNames = (classId: string, timeSlot: string): string[] => {
    const slotAppts = (dateAppointments || []).filter(
      (a) =>
        (a.class_schedule_id === classId || a.time_slot === timeSlot) &&
        (a.status === 'confirmed' || a.status === 'delegated') &&
        a.student_id !== user?.id
    );
    const fixedOthers = (allFixedForDay || []).filter(
      (f) =>
        (f.class_schedule_id === classId || f.time_slot === timeSlot) &&
        f.student_id !== user?.id &&
        !slotAppts.some((a) => a.student_id === f.student_id)
    );
    const profileMap = new Map((classmateProfiles || []).map((p) => [p.id, p.name || 'Aluno']));
    const names: string[] = [];
    slotAppts.forEach((a) => {
      const name = profileMap.get(a.student_id);
      if (name) names.push(name);
    });
    // Also include fixed students not yet with appointments
    const fixedIds = fixedOthers.map((f) => f.student_id);
    if (fixedIds.length > 0) {
      // We need their names too - they might not be in classmateProfiles yet
      // For now, show from profileMap if available
      fixedIds.forEach((id) => {
        const name = profileMap.get(id);
        if (name) names.push(name);
      });
    }
    return names;
  };

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
  });

  // 4. Fetch THIS student's fixed schedules for this day (for button state)
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

  // 5. Fetch locked slots
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

  // 6. Fetch user's existing bookings for conflict detection
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

  // Student's own fixed class_schedule_ids and time_slots
  const myFixedClassIds = new Set(
    myFixedSchedules?.filter((s) => s.class_schedule_id).map((s) => s.class_schedule_id!) || []
  );
  const myFixedTimeSlots = new Set(
    myFixedSchedules?.map((s) => s.time_slot) || []
  );

  // Student's existing bookings (any type)
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

  // Check if this student is fixed for a given slot
  const isStudentFixed = (classId: string, timeSlot: string) =>
    myFixedClassIds.has(classId) || myFixedTimeSlots.has(timeSlot);

  // Check if this student already has a booking (fixed or manual)
  const isSlotBooked = (classId: string, timeSlot: string) =>
    bookedClassIds.has(classId) || bookedTimeSlots.has(timeSlot);

  // Time conflict: same start_time already booked
  const hasTimeConflict = (startTime: string) => {
    const slotKey = startTime.slice(0, 5);
    return bookedTimeSlots.has(slotKey);
  };

  /**
   * Effective remaining spots:
   * = maxCapacity - existingAppointments
   * But we also ensure fixed students who DON'T yet have an appointment row
   * are subtracted. Fixed students with existing appointments are already
   * counted in slotCounts, so we only add the delta.
   */
  const getEffectiveRemaining = (classId: string, maxCapacity: number) => {
    const appointmentCount = slotCounts?.[classId] || 0;
    const totalFixed = fixedCountByClassId[classId] || 0;
    // Fixed students already with appointments are in appointmentCount.
    // We need: max - max(appointmentCount, totalFixed)
    // Because all fixed students WILL have a spot, even if not yet generated.
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
      queryClient.invalidateQueries({ queryKey: ['slotCounts'] });
      queryClient.invalidateQueries({ queryKey: ['userBookings'] });
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
