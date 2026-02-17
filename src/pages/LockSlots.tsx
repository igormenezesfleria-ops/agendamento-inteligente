import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays, isBefore, startOfDay, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Lock, Unlock, Plus, CalendarIcon, Loader2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LockedSlot {
  id: string;
  date: string;
  time_slot: string;
  reason: string | null;
  created_at: string;
}

export default function LockSlots() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedDayOfWeek = selectedDate ? getDay(selectedDate) : null;

  // Fetch dynamic slots from class_schedules for selected day
  const { data: daySlots } = useQuery({
    queryKey: ['lock-day-slots', user?.id, selectedDayOfWeek],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_schedules')
        .select('start_time, end_time')
        .eq('instructor_id', user!.id)
        .eq('day_of_week', selectedDayOfWeek!)
        .order('start_time');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && selectedDayOfWeek !== null,
  });

  // Fetch locked slots
  const { data: lockedSlots, isLoading } = useQuery({
    queryKey: ['locked-slots'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('locked_slots')
        .select('*')
        .gte('date', today)
        .order('date', { ascending: true })
        .order('time_slot', { ascending: true });
      if (error) throw error;
      return data as LockedSlot[];
    },
  });

  const addLockedSlot = async () => {
    if (!selectedDate || !selectedTimeSlot) {
      toast({ title: 'Campos obrigatórios', description: 'Selecione uma data e um horário.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const { data: existing } = await supabase
        .from('locked_slots')
        .select('id')
        .eq('date', dateStr)
        .eq('time_slot', selectedTimeSlot)
        .maybeSingle();
      if (existing) {
        toast({ title: 'Horário já trancado', description: 'Este horário já está bloqueado.', variant: 'destructive' });
        setIsSubmitting(false);
        return;
      }
      const { error } = await supabase.from('locked_slots').insert({
        date: dateStr,
        time_slot: selectedTimeSlot,
        reason: reason || null,
        locked_by: user?.id,
      });
      if (error) throw error;
      toast({ title: 'Horário trancado!', description: `${format(selectedDate, 'dd/MM/yyyy')} às ${selectedTimeSlot} foi bloqueado.` });
      setSelectedDate(undefined);
      setSelectedTimeSlot('');
      setReason('');
      setIsAddDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['locked-slots'] });
    } catch (error: any) {
      toast({ title: 'Erro ao trancar', description: error.message || 'Não foi possível trancar o horário.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeLockedSlot = useMutation({
    mutationFn: async (slotId: string) => {
      const { error } = await supabase.from('locked_slots').delete().eq('id', slotId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Horário liberado', description: 'O horário foi desbloqueado com sucesso.' });
      queryClient.invalidateQueries({ queryKey: ['locked-slots'] });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao liberar', description: error.message, variant: 'destructive' });
    },
  });

  const slotsByDate = lockedSlots?.reduce((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot);
    return acc;
  }, {} as Record<string, LockedSlot[]>);

  const today = startOfDay(new Date());
  const maxDate = addDays(today, 31);

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-display text-3xl text-foreground">Trancamentos</h1>
            <p className="text-muted-foreground">Bloqueie horários específicos para impedir agendamentos.</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="accent"><Plus className="w-4 h-4 mr-2" />Trancar Horário</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Trancar Horário</DialogTitle>
                <DialogDescription>Selecione uma data e horário para bloquear agendamentos.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !selectedDate && 'text-muted-foreground')}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "dd 'de' MMMM, yyyy", { locale: ptBR }) : 'Selecione uma data'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(d) => { setSelectedDate(d); setSelectedTimeSlot(''); }}
                        disabled={(date) => isBefore(date, today) || date > maxDate}
                        initialFocus
                        className={cn('p-3 pointer-events-auto')}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Horário</Label>
                  <Select value={selectedTimeSlot} onValueChange={setSelectedTimeSlot}>
                    <SelectTrigger>
                      <SelectValue placeholder={!selectedDate ? 'Selecione uma data primeiro' : daySlots && daySlots.length === 0 ? 'Nenhum horário neste dia' : 'Selecione um horário'} />
                    </SelectTrigger>
                    <SelectContent>
                      {(daySlots || []).map((slot) => {
                        const key = slot.start_time?.slice(0, 5) || '';
                        return (
                          <SelectItem key={key} value={key}>
                            {key} - {slot.end_time?.slice(0, 5)}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason">Motivo (opcional)</Label>
                  <Input id="reason" placeholder="Ex: Manutenção, feriado..." value={reason} onChange={(e) => setReason(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isSubmitting}>Cancelar</Button>
                <Button variant="accent" onClick={addLockedSlot} disabled={isSubmitting || !selectedTimeSlot}>
                  {isSubmitting ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Trancando...</>) : (<><Lock className="w-4 h-4 mr-2" />Trancar</>)}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
              <Lock className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{lockedSlots?.length ?? 0}</p>
              <p className="text-sm text-muted-foreground">Horários trancados</p>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>
        ) : slotsByDate && Object.keys(slotsByDate).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(slotsByDate).map(([date, slots]) => (
              <div key={date}>
                <h3 className="font-display text-lg text-foreground mb-3">
                  {format(new Date(date + 'T12:00:00'), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </h3>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {slots.map((slot) => (
                    <Card key={slot.id} className="card-hover">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                              <Clock className="w-5 h-5 text-destructive" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{slot.time_slot}</p>
                              {slot.reason && <p className="text-sm text-muted-foreground">{slot.reason}</p>}
                            </div>
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-accent">
                                <Unlock className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Liberar horário?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  O horário {slot.time_slot} de {format(new Date(slot.date + 'T12:00:00'), 'dd/MM/yyyy')} será liberado para agendamentos.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => removeLockedSlot.mutate(slot.id)}>Liberar</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-secondary mx-auto flex items-center justify-center mb-4">
                <Lock className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-display text-xl text-foreground mb-2">Nenhum horário trancado</h3>
              <p className="text-muted-foreground mb-6">Tranque horários para impedir que alunos façam agendamentos.</p>
              <Button variant="accent" onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />Trancar Primeiro Horário
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
