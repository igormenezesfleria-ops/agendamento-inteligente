import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Dumbbell, ArrowRight, ArrowLeft, Plus, Trash2, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const DAYS = [
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

interface ScheduleSlot {
  day_of_week: number;
  start_time: string;
  end_time: string;
  class_name: string;
  capacity: number;
}

export default function Onboarding() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1 state
  const [hourlyRate, setHourlyRate] = useState('');
  const [collaboratorRate, setCollaboratorRate] = useState('');
  const [defaultClassName, setDefaultClassName] = useState('Musculação');
  const [defaultCapacity, setDefaultCapacity] = useState('10');

  // Step 2 state
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [newSlot, setNewSlot] = useState<ScheduleSlot>({
    day_of_week: 1,
    start_time: '08:00',
    end_time: '09:00',
    class_name: 'Musculação',
    capacity: 10,
  });

  const addSlot = () => {
    if (!newSlot.start_time || !newSlot.end_time) {
      toast.error('Preencha os horários.');
      return;
    }
    if (newSlot.start_time >= newSlot.end_time) {
      toast.error('Horário de início deve ser antes do fim.');
      return;
    }
    setSlots([...slots, { ...newSlot, class_name: newSlot.class_name || defaultClassName }]);
    setNewSlot(prev => ({ ...prev, start_time: '', end_time: '' }));
  };

  const removeSlot = (index: number) => {
    setSlots(slots.filter((_, i) => i !== index));
  };

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Update profile with business settings
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
          collaborator_rate: collaboratorRate ? parseFloat(collaboratorRate) : null,
          default_capacity: parseInt(defaultCapacity) || 10,
          is_onboarded: true,
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Insert schedule slots
      if (slots.length > 0) {
        const { error: slotsError } = await supabase
          .from('class_schedules')
          .insert(
            slots.map(s => ({
              instructor_id: user.id,
              day_of_week: s.day_of_week,
              start_time: s.start_time,
              end_time: s.end_time,
              class_name: s.class_name,
              capacity: s.capacity,
            }))
          );

        if (slotsError) throw slotsError;
      }

      await refreshProfile();
      toast.success('Configuração concluída! Bem-vindo ao seu painel.');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar configurações. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl accent-gradient flex items-center justify-center">
            <Dumbbell className="w-5 h-5 text-accent-foreground" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-foreground">Configure seu Studio</h1>
            <p className="text-sm text-muted-foreground">Etapa {step} de 2</p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="max-w-2xl mx-auto w-full px-6 pt-6">
        <div className="flex gap-2">
          <div className={cn('h-1.5 flex-1 rounded-full transition-colors', 'bg-accent')} />
          <div className={cn('h-1.5 flex-1 rounded-full transition-colors', step >= 2 ? 'bg-accent' : 'bg-muted')} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-6 py-8">
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="font-display text-2xl text-foreground mb-1">Configurações Gerais</h2>
              <p className="text-muted-foreground">Defina os valores e padrões do seu negócio.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hourlyRate">Preço por Hora/Aula (R$) — Opcional</Label>
                <Input
                  id="hourlyRate"
                  type="number"
                  step="0.01"
                  placeholder="Ex: 80.00"
                  value={hourlyRate}
                  onChange={e => setHourlyRate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="collaboratorRate">Pagamento Colaborador (R$) — Opcional</Label>
                <Input
                  id="collaboratorRate"
                  type="number"
                  step="0.01"
                  placeholder="Ex: 40.00"
                  value={collaboratorRate}
                  onChange={e => setCollaboratorRate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultClassName">Nome Padrão da Aula</Label>
                <Input
                  id="defaultClassName"
                  placeholder="Ex: Musculação"
                  value={defaultClassName}
                  onChange={e => setDefaultClassName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultCapacity">Capacidade Padrão (alunos por horário)</Label>
                <Input
                  id="defaultCapacity"
                  type="number"
                  min="1"
                  placeholder="10"
                  value={defaultCapacity}
                  onChange={e => setDefaultCapacity(e.target.value)}
                />
              </div>
            </div>

            <Button variant="accent" size="lg" className="w-full" onClick={() => setStep(2)}>
              Próximo <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="font-display text-2xl text-foreground mb-1">Definir Agenda</h2>
              <p className="text-muted-foreground">Adicione os horários disponíveis para aulas.</p>
            </div>

            {/* Add slot form */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Dia</Label>
                  <Select
                    value={String(newSlot.day_of_week)}
                    onValueChange={v => setNewSlot(prev => ({ ...prev, day_of_week: parseInt(v) }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DAYS.map(d => (
                        <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm">Aula</Label>
                  <Input
                    placeholder={defaultClassName}
                    value={newSlot.class_name}
                    onChange={e => setNewSlot(prev => ({ ...prev, class_name: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Início</Label>
                  <Input
                    type="time"
                    value={newSlot.start_time}
                    onChange={e => setNewSlot(prev => ({ ...prev, start_time: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Fim</Label>
                  <Input
                    type="time"
                    value={newSlot.end_time}
                    onChange={e => setNewSlot(prev => ({ ...prev, end_time: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Vagas</Label>
                  <Input
                    type="number"
                    min="1"
                    value={newSlot.capacity}
                    onChange={e => setNewSlot(prev => ({ ...prev, capacity: parseInt(e.target.value) || 1 }))}
                  />
                </div>
              </div>

              <Button type="button" variant="outline" className="w-full" onClick={addSlot}>
                <Plus className="w-4 h-4 mr-2" /> Adicionar Horário
              </Button>
            </div>

            {/* Slots list */}
            {slots.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Horários adicionados ({slots.length})</Label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {slots.map((slot, i) => (
                    <div key={i} className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-accent">
                          {DAYS.find(d => d.value === slot.day_of_week)?.label}
                        </span>
                        <span className="text-sm text-foreground">
                          {slot.start_time} - {slot.end_time}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {slot.class_name} · {slot.capacity} vagas
                        </span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeSlot(i)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" size="lg" className="flex-1" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
              </Button>
              <Button
                variant="accent"
                size="lg"
                className="flex-1"
                onClick={handleFinish}
                disabled={saving}
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Salvando...</>
                ) : (
                  <><CheckCircle className="w-4 h-4 mr-2" /> Finalizar</>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
