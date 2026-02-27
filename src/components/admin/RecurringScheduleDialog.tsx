import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CalendarClock, Plus, Trash2 } from 'lucide-react';
import { DAYS_OF_WEEK } from '@/lib/constants';

interface RecurringConfig {
  id: string;
  student_id: string;
  day_of_week: number;
  time_slot: string;
  class_schedule_id: string | null;
  instructor_id: string | null;
  is_active: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: { id: string; name: string | null };
}

export function RecurringScheduleDialog({ open, onOpenChange, student }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addingNew, setAddingNew] = useState(false);
  const [newDay, setNewDay] = useState<string>('');
  const [newTime, setNewTime] = useState<string>('');
  const [newInstructor, setNewInstructor] = useState<string>('');

  // Fetch existing recurring schedules for this student
  const { data: recurringSchedules, isLoading } = useQuery({
    queryKey: ['recurring-schedules', student.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recurring_student_schedules')
        .select('*')
        .eq('student_id', student.id)
        .eq('business_owner_id', user!.id)
        .order('day_of_week');
      if (error) throw error;
      return data as RecurringConfig[];
    },
    enabled: open && !!user?.id,
  });

  // Fetch class schedules for dropdown
  const { data: classSlots } = useQuery({
    queryKey: ['admin-class-schedules', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_schedules')
        .select('*')
        .eq('instructor_id', user!.id)
        .order('day_of_week')
        .order('start_time');
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!user?.id,
  });

  // Fetch collaborators for instructor selection
  const { data: collaborators } = useQuery({
    queryKey: ['collaborators-list', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('role', 'collaborator')
        .eq('business_owner_id', user!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!user?.id,
  });

  // Filter class slots by selected day
  const slotsForDay = classSlots?.filter(
    (s) => s.day_of_week === Number(newDay)
  ) || [];

  // Selected class schedule (to auto-fill instructor)
  const selectedSlot = classSlots?.find(
    (s) => s.day_of_week === Number(newDay) && s.start_time?.slice(0, 5) === newTime
  );

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!newDay || !newTime) throw new Error('Selecione dia e horário');

      const instructorId = newInstructor || selectedSlot?.default_collaborator_id || user!.id;

      const { error } = await supabase
        .from('recurring_student_schedules')
        .insert({
          student_id: student.id,
          business_owner_id: user!.id,
          day_of_week: Number(newDay),
          time_slot: newTime,
          class_schedule_id: selectedSlot?.id || null,
          instructor_id: instructorId,
          is_active: true,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Horário fixo adicionado', description: 'O agendamento recorrente foi criado.' });
      queryClient.invalidateQueries({ queryKey: ['recurring-schedules', student.id] });
      setAddingNew(false);
      setNewDay('');
      setNewTime('');
      setNewInstructor('');
    },
    onError: (err: any) => {
      toast({
        title: 'Erro',
        description: err.message?.includes('duplicate') ? 'Esse horário fixo já existe para este aluno.' : 'Não foi possível adicionar.',
        variant: 'destructive',
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('recurring_student_schedules')
        .update({ is_active: isActive })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-schedules', student.id] });
      toast({ title: 'Status atualizado' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('recurring_student_schedules')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-schedules', student.id] });
      toast({ title: 'Horário fixo removido' });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-accent" />
            Aluno Fixo — {student.name || 'Aluno'}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Existing recurring schedules */}
            {recurringSchedules && recurringSchedules.length > 0 ? (
              <div className="space-y-2">
                {recurringSchedules.map((rs) => (
                  <div
                    key={rs.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                  >
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={rs.is_active}
                        onCheckedChange={(checked) =>
                          toggleMutation.mutate({ id: rs.id, isActive: checked })
                        }
                      />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {DAYS_OF_WEEK[rs.day_of_week]} · {rs.time_slot}
                        </p>
                        <Badge variant={rs.is_active ? 'confirmed' : 'outline'} className="text-xs mt-0.5">
                          {rs.is_active ? 'Ativo' : 'Pausado'}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(rs.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum horário fixo configurado.
              </p>
            )}

            {/* Add new */}
            {addingNew ? (
              <div className="space-y-3 p-4 rounded-lg border bg-card">
                <p className="text-sm font-semibold text-foreground">Novo Horário Fixo</p>

                <Select value={newDay} onValueChange={(v) => { setNewDay(v); setNewTime(''); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Dia da semana" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((day, i) => (
                      <SelectItem key={i} value={String(i)}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {newDay && (
                  <Select value={newTime} onValueChange={setNewTime}>
                    <SelectTrigger>
                      <SelectValue placeholder="Horário" />
                    </SelectTrigger>
                    <SelectContent>
                      {slotsForDay.length > 0 ? (
                        slotsForDay.map((s) => (
                          <SelectItem key={s.id} value={s.start_time?.slice(0, 5) || ''}>
                            {s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)} ({s.class_name})
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="__none" disabled>
                          Sem horários configurados neste dia
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}

                {newTime && collaborators && collaborators.length > 0 && (
                  <Select value={newInstructor} onValueChange={setNewInstructor}>
                    <SelectTrigger>
                      <SelectValue placeholder="Instrutor (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={user!.id}>Eu mesmo</SelectItem>
                      {collaborators.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name || 'Colaborador'}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setAddingNew(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={!newDay || !newTime || addMutation.isPending}
                    onClick={() => addMutation.mutate()}
                  >
                    {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setAddingNew(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Horário Fixo
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
