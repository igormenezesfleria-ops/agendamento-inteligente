import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Clock, Inbox, UserCheck, Pencil, ListOrdered } from 'lucide-react';
import { DAYS_OF_WEEK } from '@/lib/constants';

export default function AdminScheduleManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState('1');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [capacity, setCapacity] = useState('10');
  const [className, setClassName] = useState('Musculação');
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [actionWindowHours, setActionWindowHours] = useState('2');
  const [defaultCollaboratorId, setDefaultCollaboratorId] = useState<string>('none');
  const [waitlistEnabled, setWaitlistEnabled] = useState(true);

  // Edit mode state
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: schedules, isLoading } = useQuery({
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
    enabled: !!user?.id,
  });

  // Fetch collaborators for fixed collaborator select
  const { data: collaborators } = useQuery({
    queryKey: ['collaborators-for-schedule'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('role', 'collaborator')
        .eq('business_owner_id', user!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const insertData: any = {
        instructor_id: user!.id,
        day_of_week: parseInt(dayOfWeek),
        start_time: startTime,
        end_time: endTime,
        capacity: parseInt(capacity) || 10,
        class_name: className || 'Musculação',
        requires_approval: requiresApproval,
        action_window_hours: parseInt(actionWindowHours) || 2,
      };
      insertData.waitlist_enabled = waitlistEnabled;
      if (defaultCollaboratorId && defaultCollaboratorId !== 'none') {
        insertData.default_collaborator_id = defaultCollaboratorId;
      }

      if (editingId) {
        const { error } = await supabase.from('class_schedules').update(insertData).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('class_schedules').insert(insertData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? 'Horário atualizado!' : 'Horário adicionado!');
      queryClient.invalidateQueries({ queryKey: ['admin-class-schedules'] });
      resetAndClose();
    },
    onError: () => toast.error('Erro ao adicionar horário.'),
  });

  const resetAndClose = () => {
    setOpen(false);
    setEditingId(null);
    setDayOfWeek('1');
    setStartTime('09:00');
    setEndTime('10:00');
    setCapacity('10');
    setClassName('Musculação');
    setRequiresApproval(true);
    setActionWindowHours('2');
    setDefaultCollaboratorId('none');
    setWaitlistEnabled(true);
  };

  const openEdit = (slot: any) => {
    setEditingId(slot.id);
    setDayOfWeek(String(slot.day_of_week));
    setStartTime(slot.start_time?.slice(0, 5) || '09:00');
    setEndTime(slot.end_time?.slice(0, 5) || '10:00');
    setCapacity(String(slot.capacity));
    setClassName(slot.class_name || 'Musculação');
    setRequiresApproval(slot.requires_approval);
    setActionWindowHours(String(slot.action_window_hours || 2));
    setDefaultCollaboratorId(slot.default_collaborator_id || 'none');
    setWaitlistEnabled(slot.waitlist_enabled ?? true);
    setOpen(true);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('class_schedules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Horário removido!');
      queryClient.invalidateQueries({ queryKey: ['admin-class-schedules'] });
    },
    onError: () => toast.error('Erro ao remover horário.'),
  });

  // Build collaborator name map for display
  const collabMap = new Map((collaborators || []).map(c => [c.id, c.name || 'Colaborador']));

  const grouped = (schedules || []).reduce<Record<number, typeof schedules>>((acc, s) => {
    if (!acc[s.day_of_week]) acc[s.day_of_week] = [];
    acc[s.day_of_week]!.push(s);
    return acc;
  }, {});

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="font-display text-3xl text-foreground">Configurar Horários</h1>
            <p className="text-muted-foreground">Defina os horários semanais disponíveis para agendamento.</p>
          </div>
          <Dialog open={open} onOpenChange={(v) => { if (!v) resetAndClose(); else setOpen(true); }}>
            <DialogTrigger asChild>
              <Button variant="accent" onClick={() => { resetAndClose(); setOpen(true); }}><Plus className="w-4 h-4 mr-2" />Novo Horário</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editingId ? 'Editar Horário' : 'Adicionar Horário'}</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); addMutation.mutate(); }} className="space-y-4">
                <div className="space-y-2">
                  <Label>Dia da Semana</Label>
                  <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map((d, i) => (
                        <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nome da Aula</Label>
                  <Input value={className} onChange={(e) => setClassName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Início</Label>
                    <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Fim</Label>
                    <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Capacidade</Label>
                    <Input type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Antecedência mínima (horas)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={actionWindowHours}
                      onChange={(e) => setActionWindowHours(e.target.value)}
                      placeholder="2"
                    />
                    <p className="text-xs text-muted-foreground">Para agendar/cancelar</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Colaborador Fixo</Label>
                  <Select value={defaultCollaboratorId} onValueChange={setDefaultCollaboratorId}>
                    <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {(collaborators || []).map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name || 'Colaborador'}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Será automaticamente atribuído aos agendamentos.</p>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <Label>Exige Aprovação?</Label>
                    <p className="text-xs text-muted-foreground">Se desativado, agendamentos são confirmados automaticamente.</p>
                  </div>
                  <Switch checked={requiresApproval} onCheckedChange={setRequiresApproval} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <Label>Fila de Espera</Label>
                    <p className="text-xs text-muted-foreground">Quando lotado, alunos podem entrar na fila.</p>
                  </div>
                  <Switch checked={waitlistEnabled} onCheckedChange={setWaitlistEnabled} />
                </div>
                <Button type="submit" variant="accent" className="w-full" disabled={addMutation.isPending}>
                  {addMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {editingId ? 'Salvar Alterações' : 'Adicionar'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
              <Inbox className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">Nenhum horário configurado. Adicione seu primeiro horário.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([day, slots]) => (
                <div key={day}>
                  <h3 className="font-display text-lg text-foreground mb-3">{DAYS_OF_WEEK[Number(day)]}</h3>
                  <div className="space-y-2">
                    {slots!.map((slot: any) => (
                      <Card key={slot.id}>
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-wrap">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium text-foreground">
                              {slot.start_time?.slice(0, 5)} - {slot.end_time?.slice(0, 5)}
                            </span>
                            <span className="text-sm text-muted-foreground">{slot.class_name}</span>
                            <span className="text-xs text-muted-foreground">({slot.capacity} vagas)</span>
                            <span className="text-xs text-muted-foreground">⏱ {slot.action_window_hours}h</span>
                            {!slot.requires_approval && (
                              <span className="text-xs text-accent font-medium">Auto-confirma</span>
                            )}
                            {slot.default_collaborator_id && (
                              <span className="text-xs text-primary font-medium flex items-center gap-1">
                                <UserCheck className="w-3 h-3" />
                                {collabMap.get(slot.default_collaborator_id) || 'Colaborador'}
                              </span>
                            )}
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(slot.id)} disabled={deleteMutation.isPending}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
