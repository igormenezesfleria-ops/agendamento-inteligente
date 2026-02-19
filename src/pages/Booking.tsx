import { useState } from 'react';
import { format, isAfter, addHours, getDay } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DateSelector } from '@/components/booking/DateSelector';
import { SlotCard } from '@/components/booking/SlotCard';
import { BOOKING_DEADLINE_HOURS } from '@/lib/constants';
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

  // Fetch class_schedules for the trainer matching the selected day
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

  // Fetch slot counts for selected date, grouped by class_schedule_id
  const { data: slotCounts, isLoading: isLoadingCounts } = useQuery({
    queryKey: ['slotCounts', formattedDate],
    queryFn: async () => {
      if (!formattedDate) return {};
      const { data, error } = await supabase
        .from('appointments')
        .select('time_slot, class_schedule_id')
        .eq('date', formattedDate)
        .in('status', ['pending', 'confirmed', 'delegated']);
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach((apt) => {
        // Count per class_schedule_id when available, fallback to time_slot
        const key = apt.class_schedule_id || apt.time_slot;
        counts[key] = (counts[key] || 0) + 1;
      });
      return counts;
    },
    enabled: !!formattedDate,
  });

  // Fetch locked slots
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

  // Fetch user's existing bookings per class_schedule_id
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
      // Return class_schedule_ids the user has booked
      return data?.map((s) => s.class_schedule_id || s.time_slot) || [];
    },
    enabled: !!formattedDate && !!user?.id,
  });

  const bookMutation = useMutation({
    mutationFn: async ({ timeSlot, classScheduleId }: { timeSlot: string; classScheduleId: string }) => {
      if (!user?.id || !formattedDate) throw new Error('Missing data');
      
      const matchingSlot = classSlots?.find(s => s.id === classScheduleId);
      const autoConfirm = matchingSlot && !matchingSlot.requires_approval;
      
      const insertData: any = {
        student_id: user.id,
        date: formattedDate,
        time_slot: timeSlot,
        class_schedule_id: classScheduleId,
        status: autoConfirm ? 'confirmed' : 'pending',
      };
      
      if (autoConfirm && trainerId) {
        insertData.instructor_id = trainerId;
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
      if (error.message?.includes('duplicate')) {
        toast.error('Você já tem um agendamento neste horário');
      } else {
        toast.error('Erro ao fazer agendamento. Tente novamente.');
      }
      setBookingSlot(null);
    },
  });

  const handleBook = (timeSlot: string, classScheduleId: string) => {
    setBookingSlot(classScheduleId);
    bookMutation.mutate({ timeSlot, classScheduleId });
  };

  const canBookSlot = (startTime: string) => {
    if (!selectedDate) return false;
    const [hours, mins] = startTime.split(':').map(Number);
    const slotDateTime = new Date(selectedDate);
    slotDateTime.setHours(hours, mins || 0, 0, 0);
    const deadline = addHours(new Date(), BOOKING_DEADLINE_HOURS);
    return isAfter(slotDateTime, deadline);
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
                  return (
                    <SlotCard
                      key={slot.id}
                      timeSlot={slotKey}
                      label={`${slot.class_name} · ${slotKey} - ${slot.end_time?.slice(0, 5)}`}
                      count={slotCounts?.[classId] || 0}
                      isLocked={lockedSlots?.includes(slotKey) || false}
                      isBooked={userBookings?.includes(classId) || false}
                      canBook={canBookSlot(slotKey)}
                      isLoading={bookingSlot === classId}
                      onBook={() => handleBook(slotKey, classId)}
                      maxCapacity={slot.capacity}
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
