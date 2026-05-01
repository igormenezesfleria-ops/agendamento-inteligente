import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { LoadEvolutionCard } from '@/components/admin/LoadEvolutionCard';
import {
  AlertTriangle, Cake, Ruler, Flame, Dumbbell, Phone, Target, Activity,
  User as UserIcon, HeartPulse, Pencil, Save, X, Send, Scale, Zap, Loader2,
} from 'lucide-react';

interface Student {
  id: string;
  name: string | null;
  phone: string | null;
  emergency_contact: string | null;
  main_objective: string | null;
  has_injury: boolean;
  injury_details: string | null;
  is_active: boolean;
  height: string | null;
  birth_date: string | null;
  current_streak: number;
  weight_kg?: number | null;
  max_strength?: string | null;
}

interface Props {
  student: Student;
  age: number | null;
  objectiveLabels: Record<string, string>;
}

const OBJECTIVE_OPTIONS = [
  { value: 'emagrecimento', label: 'Emagrecimento' },
  { value: 'hipertrofia', label: 'Hipertrofia' },
  { value: 'saude', label: 'Saúde / Condicionamento' },
  { value: 'reabilitacao', label: 'Reabilitação' },
  { value: 'alta_performance', label: 'Alta Performance' },
];

export function StudentFichaTab({ student, age, objectiveLabels }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [editingContato, setEditingContato] = useState(false);
  const [editingPerfil, setEditingPerfil] = useState(false);
  const [editingMedidas, setEditingMedidas] = useState(false);

  // Local edit state
  const [phone, setPhone] = useState(student.phone || '');
  const [emergency, setEmergency] = useState(student.emergency_contact || '');
  const [objective, setObjective] = useState(student.main_objective || '');
  const [isActive, setIsActive] = useState<boolean>(!!student.is_active);
  const [hasInjury, setHasInjury] = useState<boolean>(!!student.has_injury);
  const [injuryDetails, setInjuryDetails] = useState(student.injury_details || '');
  const [weight, setWeight] = useState(student.weight_kg != null ? String(student.weight_kg) : '');
  const [height, setHeight] = useState(student.height || '');
  const [maxStrength, setMaxStrength] = useState(student.max_strength || '');

  const updateMutation = useMutation({
    mutationFn: async (patch: Record<string, any>) => {
      const { error } = await supabase.from('profiles').update(patch).eq('id', student.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-students'] });
      toast({ title: 'Dados atualizados!' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao salvar', description: err?.message || 'Tente novamente.', variant: 'destructive' });
    },
  });

  const saveContato = async () => {
    await updateMutation.mutateAsync({ phone: phone.trim() || null, emergency_contact: emergency.trim() || null });
    setEditingContato(false);
  };

  const savePerfil = async () => {
    await updateMutation.mutateAsync({
      main_objective: objective || null,
      is_active: isActive,
      has_injury: hasInjury,
      injury_details: hasInjury ? (injuryDetails.trim() || null) : null,
    });
    setEditingPerfil(false);
  };

  const saveMedidas = async () => {
    const parsedWeight = weight.trim() ? Number(weight.replace(',', '.')) : null;
    if (parsedWeight !== null && (Number.isNaN(parsedWeight) || parsedWeight < 0 || parsedWeight > 500)) {
      toast({ title: 'Peso inválido', description: 'Informe um valor entre 0 e 500 kg.', variant: 'destructive' });
      return;
    }
    await updateMutation.mutateAsync({
      weight_kg: parsedWeight,
      height: height.trim() || null,
      max_strength: maxStrength.trim() || null,
    });
    setEditingMedidas(false);
  };

  const requestUpdate = () => {
    toast({
      title: 'Solicitação enviada!',
      description: `Um link de atualização da ficha foi enviado para ${student.name || 'o aluno'} via WhatsApp.`,
    });
  };

  const SectionHeader = ({
    icon, title, editing, onEdit, onCancel, onSave,
  }: {
    icon: React.ReactNode; title: string; editing: boolean;
    onEdit: () => void; onCancel: () => void; onSave: () => void;
  }) => (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
      </div>
      {editing ? (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={onCancel} disabled={updateMutation.isPending} className="h-7 px-2">
            <X className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" onClick={onSave} disabled={updateMutation.isPending} className="h-7 px-2 gap-1">
            {updateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Salvar
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="ghost" onClick={onEdit} className="h-7 px-2 text-muted-foreground hover:text-accent">
          <Pencil className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Request update CTA */}
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={requestUpdate}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-accent to-accent/80 text-accent-foreground font-semibold text-sm shadow-sm hover:opacity-95 transition-opacity"
            >
              <Send className="w-4 h-4" />
              Solicitar Atualização de Ficha
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[260px] text-center">
            Envia um link para o aluno preencher / atualizar seus dados e medidas em casa.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Injury Alert */}
      {student.has_injury && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>⚠️ Lesão / Limitação</AlertTitle>
          <AlertDescription className="font-medium">
            {student.injury_details || 'Não especificada'}
          </AlertDescription>
        </Alert>
      )}

      {/* Age & Height highlight */}
      {(student.birth_date || student.height) && (
        <div className="flex gap-3">
          {student.birth_date && age !== null && (
            <div className="flex-1 flex items-center gap-2 p-3 rounded-lg bg-accent/10 border border-accent/20">
              <Cake className="w-4 h-4 text-accent shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Idade</p>
                <p className="text-lg font-bold text-accent">{age} anos</p>
              </div>
            </div>
          )}
          {student.height && (
            <div className="flex-1 flex items-center gap-2 p-3 rounded-lg bg-accent/10 border border-accent/20">
              <Ruler className="w-4 h-4 text-accent shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Altura</p>
                <p className="text-lg font-bold text-accent">{student.height}m</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-muted/40 border border-border/60">
          <Flame className="w-4 h-4 text-orange-500 mb-1" />
          <p className="text-lg font-bold text-foreground leading-none">{student.current_streak}</p>
          <p className="text-[10px] text-muted-foreground mt-1 text-center leading-tight">Semanas Seguidas</p>
        </div>
        <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-muted/40 border border-border/60">
          <Dumbbell className="w-4 h-4 text-accent mb-1" />
          <p className="text-lg font-bold text-foreground leading-none">—</p>
          <p className="text-[10px] text-muted-foreground mt-1 text-center leading-tight">Treinos Concluídos</p>
        </div>
        <LoadEvolutionCard studentId={student.id} />
      </div>

      {/* Contato */}
      <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
        <SectionHeader
          icon={<UserIcon className="w-3.5 h-3.5 text-accent" />}
          title="Contato"
          editing={editingContato}
          onEdit={() => {
            setPhone(student.phone || '');
            setEmergency(student.emergency_contact || '');
            setEditingContato(true);
          }}
          onCancel={() => setEditingContato(false)}
          onSave={saveContato}
        />
        {editingContato ? (
          <div className="space-y-3">
            <div>
              <Label className="text-[11px] text-muted-foreground">Telefone / WhatsApp</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" maxLength={20} className="mt-1" />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Contato de Emergência</Label>
              <Input value={emergency} onChange={(e) => setEmergency(e.target.value)} placeholder="Nome e telefone" maxLength={120} className="mt-1" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground">Telefone / WhatsApp</p>
                <p className="text-sm font-semibold text-foreground truncate">{student.phone || '—'}</p>
              </div>
            </div>
            <div className="h-px bg-border/60" />
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground">Contato de Emergência</p>
                <p className="text-sm font-semibold text-foreground truncate">{student.emergency_contact || '—'}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Perfil Físico */}
      <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
        <SectionHeader
          icon={<HeartPulse className="w-3.5 h-3.5 text-accent" />}
          title="Perfil Físico"
          editing={editingPerfil}
          onEdit={() => {
            setObjective(student.main_objective || '');
            setIsActive(!!student.is_active);
            setHasInjury(!!student.has_injury);
            setInjuryDetails(student.injury_details || '');
            setEditingPerfil(true);
          }}
          onCancel={() => setEditingPerfil(false)}
          onSave={savePerfil}
        />
        {editingPerfil ? (
          <div className="space-y-3">
            <div>
              <Label className="text-[11px] text-muted-foreground">Objetivo Principal</Label>
              <select
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                className="mt-1 w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-accent outline-none"
              >
                <option value="">— Selecionar —</option>
                {OBJECTIVE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Pratica atividade física?</Label>
              <div className="flex gap-2 mt-1">
                <button type="button" onClick={() => setIsActive(true)} className={`flex-1 py-2 rounded-lg text-sm font-semibold border ${isActive ? 'bg-accent text-accent-foreground border-accent' : 'bg-background text-muted-foreground border-border'}`}>Sim</button>
                <button type="button" onClick={() => setIsActive(false)} className={`flex-1 py-2 rounded-lg text-sm font-semibold border ${!isActive ? 'bg-accent text-accent-foreground border-accent' : 'bg-background text-muted-foreground border-border'}`}>Não</button>
              </div>
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Lesão / Limitação?</Label>
              <div className="flex gap-2 mt-1">
                <button type="button" onClick={() => setHasInjury(true)} className={`flex-1 py-2 rounded-lg text-sm font-semibold border ${hasInjury ? 'bg-destructive text-destructive-foreground border-destructive' : 'bg-background text-muted-foreground border-border'}`}>Sim</button>
                <button type="button" onClick={() => { setHasInjury(false); setInjuryDetails(''); }} className={`flex-1 py-2 rounded-lg text-sm font-semibold border ${!hasInjury ? 'bg-accent text-accent-foreground border-accent' : 'bg-background text-muted-foreground border-border'}`}>Não</button>
              </div>
            </div>
            {hasInjury && (
              <div>
                <Label className="text-[11px] text-muted-foreground">Descrição da lesão</Label>
                <Input value={injuryDetails} onChange={(e) => setInjuryDetails(e.target.value)} placeholder="Ex: Lombalgia crônica" maxLength={200} className="mt-1" />
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-start gap-3">
              <Target className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground">Objetivo Principal</p>
                <p className="text-sm font-semibold text-foreground">
                  {student.main_objective ? (objectiveLabels[student.main_objective] || student.main_objective) : '—'}
                </p>
              </div>
            </div>
            <div className="h-px bg-border/60" />
            <div className="flex items-start gap-3">
              <Activity className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground">Pratica atividade física?</p>
                <p className="text-sm font-semibold text-foreground">{student.is_active ? 'Sim' : 'Não'}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Medidas e Testes Físicos */}
      <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
        <SectionHeader
          icon={<Scale className="w-3.5 h-3.5 text-accent" />}
          title="Medidas e Testes Físicos"
          editing={editingMedidas}
          onEdit={() => {
            setWeight(student.weight_kg != null ? String(student.weight_kg) : '');
            setHeight(student.height || '');
            setMaxStrength(student.max_strength || '');
            setEditingMedidas(true);
          }}
          onCancel={() => setEditingMedidas(false)}
          onSave={saveMedidas}
        />
        {editingMedidas ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] text-muted-foreground">Peso (kg)</Label>
                <Input type="number" inputMode="decimal" step="0.1" min="0" max="500" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="72.5" className="mt-1" />
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">Altura (m)</Label>
                <Input value={height} onChange={(e) => setHeight(e.target.value)} placeholder="1.75" maxLength={6} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Dinamometria / Força Máxima</Label>
              <Input value={maxStrength} onChange={(e) => setMaxStrength(e.target.value)} placeholder="Ex: Preensão 42 kgf · Supino 80 kg" maxLength={200} className="mt-1" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-start gap-3">
                <Scale className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground">Peso</p>
                  <p className="text-sm font-semibold text-foreground">{student.weight_kg != null ? `${student.weight_kg} kg` : '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Ruler className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground">Altura</p>
                  <p className="text-sm font-semibold text-foreground">{student.height ? `${student.height} m` : '—'}</p>
                </div>
              </div>
            </div>
            <div className="h-px bg-border/60" />
            <div className="flex items-start gap-3">
              <Zap className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground">Dinamometria / Força Máxima</p>
                <p className="text-sm font-semibold text-foreground break-words">{student.max_strength || '—'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}