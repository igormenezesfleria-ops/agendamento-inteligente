import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Loader2, Dumbbell, ChevronDown, ChevronUp, Link, Brain, Pencil, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { BIOMECHANICS_TEMPLATES } from '@/utils/biomechanicsTemplates';

interface Props {
  studentId: string;
  studentName: string | null;
}

interface Workout {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

interface Exercise {
  id: string;
  name: string;
  sets: string;
  reps: string;
  rest: string;
  sort_order: number;
}

export function StudentWorkoutsTab({ studentId, studentName }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedWorkout, setExpandedWorkout] = useState<string | null>(null);

  // Exercise form state
  const [exName, setExName] = useState('');
  const [exSets, setExSets] = useState('');
  const [exReps, setExReps] = useState('');
  const [exRest, setExRest] = useState('');
  const [exVideoUrl, setExVideoUrl] = useState('');
  const [exAiEnabled, setExAiEnabled] = useState(false);
  const [exMaxKneeFlexion, setExMaxKneeFlexion] = useState('');
  const [exValgoAlert, setExValgoAlert] = useState(false);
  const [exMovementPattern, setExMovementPattern] = useState('');
  const [exSelectedErrors, setExSelectedErrors] = useState<string[]>([]);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);

  const templateKeys = Object.keys(BIOMECHANICS_TEMPLATES);
  const activeTemplate = exMovementPattern ? BIOMECHANICS_TEMPLATES[exMovementPattern] : null;

  const { data: workouts, isLoading } = useQuery({
    queryKey: ['student-workouts', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Workout[];
    },
    enabled: !!studentId,
  });

  const { data: exercises } = useQuery({
    queryKey: ['workout-exercises', expandedWorkout],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_exercises')
        .select('*')
        .eq('workout_id', expandedWorkout!)
        .order('sort_order');
      if (error) throw error;
      return (data || []) as Exercise[];
    },
    enabled: !!expandedWorkout,
  });

  const createWorkout = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('workouts').insert({
        student_id: studentId,
        admin_id: user!.id,
        title,
        start_date: startDate,
        end_date: endDate,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Treino criado!' });
      qc.invalidateQueries({ queryKey: ['student-workouts', studentId] });
      setCreating(false);
      setTitle('');
      setStartDate('');
      setEndDate('');
    },
    onError: () => toast({ title: 'Erro ao criar treino', variant: 'destructive' }),
  });

  const addExercise = useMutation({
    mutationFn: async () => {
      const currentExercises = exercises?.length || 0;
      const { error } = await supabase.from('workout_exercises').insert({
        workout_id: expandedWorkout!,
        name: exName,
        sets: exSets,
        reps: exReps,
        rest: exRest,
        video_url: exVideoUrl,
        ai_enabled: exAiEnabled,
        ai_max_knee_flexion: exMaxKneeFlexion ? parseInt(exMaxKneeFlexion) : null,
        ai_valgo_alert: exValgoAlert,
        movement_pattern: exMovementPattern,
        selected_errors: exSelectedErrors,
        sort_order: currentExercises,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Exercício adicionado!' });
      qc.invalidateQueries({ queryKey: ['workout-exercises', expandedWorkout] });
      clearExerciseForm();
    },
    onError: () => toast({ title: 'Erro ao adicionar exercício', variant: 'destructive' }),
  });

  const updateExercise = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('workout_exercises').update({
        name: exName,
        sets: exSets,
        reps: exReps,
        rest: exRest,
        video_url: exVideoUrl,
        ai_enabled: exAiEnabled,
        ai_max_knee_flexion: exMaxKneeFlexion ? parseInt(exMaxKneeFlexion) : null,
        ai_valgo_alert: exValgoAlert,
        movement_pattern: exMovementPattern,
        selected_errors: exSelectedErrors,
      } as any).eq('id', editingExerciseId!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Exercício atualizado!' });
      qc.invalidateQueries({ queryKey: ['workout-exercises', expandedWorkout] });
      clearExerciseForm();
    },
    onError: () => toast({ title: 'Erro ao atualizar exercício', variant: 'destructive' }),
  });

  const deleteExercise = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('workout_exercises').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      if (editingExerciseId) clearExerciseForm();
      qc.invalidateQueries({ queryKey: ['workout-exercises', expandedWorkout] });
      toast({ title: 'Exercício removido' });
    },
  });

  const clearExerciseForm = () => {
    setExName('');
    setExSets('');
    setExReps('');
    setExRest('');
    setExVideoUrl('');
    setExAiEnabled(false);
    setExMaxKneeFlexion('');
    setExValgoAlert(false);
    setExMovementPattern('');
    setExSelectedErrors([]);
    setEditingExerciseId(null);
  };

  const startEditExercise = (ex: any) => {
    setExName(ex.name || '');
    setExSets(ex.sets || '');
    setExReps(ex.reps || '');
    setExRest(ex.rest || '');
    setExVideoUrl(ex.video_url || '');
    setExAiEnabled(ex.ai_enabled || false);
    setExMaxKneeFlexion(ex.ai_max_knee_flexion?.toString() || '');
    setExValgoAlert(ex.ai_valgo_alert || false);
    setExMovementPattern(ex.movement_pattern || '');
    setExSelectedErrors(ex.selected_errors || []);
    setEditingExerciseId(ex.id);
  };

  const deleteWorkout = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('workouts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Treino removido' });
      qc.invalidateQueries({ queryKey: ['student-workouts', studentId] });
      if (expandedWorkout) setExpandedWorkout(null);
    },
  });

  const getStatus = (w: Workout) => {
    const today = new Date().toISOString().split('T')[0];
    if (!w.is_active) return 'inactive';
    if (w.end_date < today) return 'expired';
    if (w.start_date > today) return 'upcoming';
    return 'active';
  };

  const statusBadge = (w: Workout) => {
    const s = getStatus(w);
    if (s === 'active') return <Badge className="bg-green-600 text-white">Ativo</Badge>;
    if (s === 'expired') return <Badge variant="destructive">Vencido</Badge>;
    if (s === 'upcoming') return <Badge variant="outline">Futuro</Badge>;
    return <Badge variant="secondary">Inativo</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Create workout form */}
      {!creating ? (
        <Button onClick={() => setCreating(true)} className="w-full gap-2">
          <Plus className="w-4 h-4" /> Criar Novo Treino
        </Button>
      ) : (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div>
              <Label>Título do Treino</Label>
              <Input placeholder="Ex: Treino A - Superior" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Início</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <Label>Fim</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => createWorkout.mutate()}
                disabled={!title || !startDate || !endDate || createWorkout.isPending}
                className="flex-1"
              >
                {createWorkout.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
              </Button>
              <Button variant="ghost" onClick={() => setCreating(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workout list */}
      {!workouts || workouts.length === 0 ? (
        <div className="text-center py-6">
          <Dumbbell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum treino prescrito ainda.</p>
        </div>
      ) : (
        workouts.map((w) => (
          <Card key={w.id}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Dumbbell className="w-4 h-4 text-accent shrink-0" />
                  <span className="font-medium text-sm truncate">{w.title}</span>
                  {statusBadge(w)}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedWorkout(expandedWorkout === w.id ? null : w.id)}
                  >
                    {expandedWorkout === w.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => deleteWorkout.mutate(w.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {w.start_date} → {w.end_date}
              </p>

              {/* Expanded exercises */}
              {expandedWorkout === w.id && (
                <div className="space-y-3 pt-2 border-t">
                  {exercises && exercises.length > 0 ? (
                    exercises.map((ex) => (
                      <div key={ex.id} className={`flex items-center justify-between p-2 rounded ${editingExerciseId === ex.id ? 'bg-accent/10 ring-1 ring-accent' : 'bg-muted/50'}`}>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{ex.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {ex.sets} séries × {ex.reps} reps · {ex.rest} descanso
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditExercise(ex)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => deleteExercise.mutate(ex.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-2">Nenhum exercício adicionado.</p>
                  )}

                  {/* Add exercise form */}
                  <div className="space-y-2 pt-2 border-t">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">
                      {editingExerciseId ? 'Editar Exercício' : 'Adicionar Exercício'}
                    </p>
                    <Input placeholder="Nome do exercício" value={exName} onChange={(e) => setExName(e.target.value)} />
                    <div className="grid grid-cols-3 gap-2">
                      <Input placeholder="Séries" value={exSets} onChange={(e) => setExSets(e.target.value)} />
                      <Input placeholder="Reps" value={exReps} onChange={(e) => setExReps(e.target.value)} />
                      <Input placeholder="Descanso" value={exRest} onChange={(e) => setExRest(e.target.value)} />
                    </div>
                    {/* AI Biofeedback Calibration Section */}
                    <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl mt-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Brain className="w-4 h-4 text-blue-600" />
                          <span className="text-xs font-semibold text-blue-800 uppercase">Parâmetros de IA (Biofeedback)</span>
                        </div>
                        <Switch checked={exAiEnabled} onCheckedChange={setExAiEnabled} />
                      </div>
                      {exAiEnabled && (
                        <div className="space-y-3 pt-1">
                          {/* Step 1: Movement Pattern Dropdown */}
                          <div>
                            <Label className="text-xs text-blue-700">Padrão de Movimento</Label>
                            <select
                              value={exMovementPattern}
                              onChange={(e) => {
                                setExMovementPattern(e.target.value);
                                setExSelectedErrors([]);
                              }}
                              className="mt-1 w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                              <option value="">Selecione um padrão...</option>
                              {templateKeys.map((key) => (
                                <option key={key} value={key}>
                                  {BIOMECHANICS_TEMPLATES[key].name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Step 2: Error Checklist */}
                          {activeTemplate && (
                            <div>
                              <Label className="text-xs text-blue-700">Erros a Monitorar</Label>
                              <div className="mt-1 space-y-2">
                                {activeTemplate.errors.map((err) => (
                                  <label key={err.id} className="flex items-center gap-2 cursor-pointer">
                                    <Checkbox
                                      checked={exSelectedErrors.includes(err.id)}
                                      onCheckedChange={(checked) => {
                                        setExSelectedErrors((prev) =>
                                          checked
                                            ? [...prev, err.id]
                                            : prev.filter((e) => e !== err.id)
                                        );
                                      }}
                                    />
                                    <span className="text-xs text-blue-800">{err.name}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Legacy manual inputs */}
                          <div>
                            <Label className="text-xs text-blue-700">Ângulo Máx. Flexão de Joelho (Graus)</Label>
                            <Input
                              type="number"
                              placeholder="90"
                              value={exMaxKneeFlexion}
                              onChange={(e) => setExMaxKneeFlexion(e.target.value)}
                              className="bg-white border-blue-200 rounded-lg w-24 text-sm focus:ring-2 focus:ring-blue-500 mt-1"
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="text-xs text-blue-700">Alinhamento Tornozelo/Joelho (Valgo)</Label>
                              <p className="text-[10px] text-blue-500">{exValgoAlert ? 'Alertar desvio interno' : 'Permitir'}</p>
                            </div>
                            <Switch checked={exValgoAlert} onCheckedChange={setExValgoAlert} />
                          </div>
                          <p className="text-[10px] text-blue-400 leading-relaxed">
                            O aluno receberá um alerta visual (linha vermelha) se ultrapassar esses limites durante a auto-gravação.
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="relative">
                      <Link className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input
                        placeholder="Link do Vídeo (YouTube)"
                        value={exVideoUrl}
                        onChange={(e) => setExVideoUrl(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 gap-1"
                        disabled={!exName || addExercise.isPending || updateExercise.isPending}
                        onClick={() => editingExerciseId ? updateExercise.mutate() : addExercise.mutate()}
                      >
                        {(addExercise.isPending || updateExercise.isPending) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : editingExerciseId ? <Pencil className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        {editingExerciseId ? 'Atualizar Exercício' : 'Adicionar'}
                      </Button>
                      {editingExerciseId && (
                        <Button size="sm" variant="ghost" onClick={clearExerciseForm}>
                          Cancelar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
