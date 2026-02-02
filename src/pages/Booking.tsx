import { useState } from 'react';
import { format, isAfter, addHours, startOfDay } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DateSelector } from '@/components/booking/DateSelector';
import { SlotCard } from '@/components/booking/SlotCard';
import { TIME_SLOTS, BOOKING_DEADLINE_HOURS } from '@/lib/constants';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function Booking() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [bookingSlot, setBookingSlot] = useState<string | null>(null);

  const formattedDate = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;

  // Fetch slot counts for selected date
  const { data: slotCounts, isLoading: isLoadingCounts } = useQuery({
    queryKey: ['slotCounts', formattedDate],
    queryFn: async () => {
      if (!formattedDate) return {};
      
      const { data, error } = await supabase
        .from('appointments')
        .select('time_slot')
        .eq('date', formattedDate)
        .in('status', ['pending', 'confirmed', 'delegated']);

      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach((apt) => {
        counts[apt.time_slot] = (counts[apt.time_slot] || 0) + 1;
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

  // Fetch user's existing bookings
  const { data: userBookings } = useQuery({
    queryKey: ['userBookings', formattedDate, user?.id],
    queryFn: async () => {
      if (!formattedDate || !user?.id) return [];
      
      const { data, error } = await supabase
        .from('appointments')
        .select('time_slot')
        .eq('student_id', user.id)
        .eq('date', formattedDate)
        .neq('status', 'cancelled');

      if (error) throw error;
      return data?.map((s) => s.time_slot) || [];
    },
    enabled: !!formattedDate && !!user?.id,
  });

  // Create booking mutation
  const bookMutation = useMutation({
    mutationFn: async (timeSlot: string) => {
      if (!user?.id || !formattedDate) throw new Error('Missing data');

      const { error } = await supabase.from('appointments').insert({
        student_id: user.id,
        date: formattedDate,
        time_slot: timeSlot,
        status: 'pending',
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Solicitação de agendamento enviada!');
      queryClient.invalidateQueries({ queryKey: ['slotCounts'] });
      queryClient.invalidateQueries({ queryKey: ['userBookings'] });
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

  const handleBook = (timeSlot: string) => {
    setBookingSlot(timeSlot);
    bookMutation.mutate(timeSlot);
  };

  const canBookSlot = (timeSlot: string) => {
    if (!selectedDate) return false;
    
    // Parse time slot
    const [hours] = timeSlot.split(':').map(Number);
    const slotDateTime = new Date(selectedDate);
    slotDateTime.setHours(hours, 0, 0, 0);
    
    // Check if booking deadline has passed (2 hours before)
    const deadline = addHours(new Date(), BOOKING_DEADLINE_HOURS);
    return isAfter(slotDateTime, deadline);
  };

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

            {isLoadingCounts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
              </div>
            ) : (
              <>
                {/* Morning slots */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Manhã
                  </h4>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {TIME_SLOTS.filter((s) => s.period === 'morning').map((slot) => (
                      <SlotCard
                        key={slot.id}
                        timeSlot={slot.id}
                        label={slot.label}
                        count={slotCounts?.[slot.id] || 0}
                        isLocked={lockedSlots?.includes(slot.id) || false}
                        isBooked={userBookings?.includes(slot.id) || false}
                        canBook={canBookSlot(slot.id)}
                        isLoading={bookingSlot === slot.id}
                        onBook={() => handleBook(slot.id)}
                      />
                    ))}
                  </div>
                </div>

                {/* Afternoon/Evening slots */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Tarde / Noite
                  </h4>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {TIME_SLOTS.filter((s) => s.period !== 'morning').map((slot) => (
                      <SlotCard
                        key={slot.id}
                        timeSlot={slot.id}
                        label={slot.label}
                        count={slotCounts?.[slot.id] || 0}
                        isLocked={lockedSlots?.includes(slot.id) || false}
                        isBooked={userBookings?.includes(slot.id) || false}
                        canBook={canBookSlot(slot.id)}
                        isLoading={bookingSlot === slot.id}
                        onBook={() => handleBook(slot.id)}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
