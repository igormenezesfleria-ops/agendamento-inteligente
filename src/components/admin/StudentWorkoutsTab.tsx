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
import { Plus, Trash2, Loader2, Dumbbell, ChevronDown, ChevronUp } from 'lucide-react';

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
        sort_order: currentExercises,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Exercício adicionado!' });
      qc.invalidateQueries({ queryKey: ['workout-exercises', expandedWorkout] });
      setExName('');
      setExSets('');
      setExReps('');
      setExRest('');
    },
    onError: () => toast({ title: 'Erro ao adicionar exercício', variant: 'destructive' }),
  });

  const deleteExercise = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('workout_exercises').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workout-exercises', expandedWorkout] });
    },
  });

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
                      <div key={ex.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{ex.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {ex.sets} séries × {ex.reps} reps · {ex.rest} descanso
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive shrink-0"
                          onClick={() => deleteExercise.mutate(ex.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-2">Nenhum exercício adicionado.</p>
                  )}

                  {/* Add exercise form */}
                  <div className="space-y-2 pt-2 border-t">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Adicionar Exercício</p>
                    <Input placeholder="Nome do exercício" value={exName} onChange={(e) => setExName(e.target.value)} />
                    <div className="grid grid-cols-3 gap-2">
                      <Input placeholder="Séries" value={exSets} onChange={(e) => setExSets(e.target.value)} />
                      <Input placeholder="Reps" value={exReps} onChange={(e) => setExReps(e.target.value)} />
                      <Input placeholder="Descanso" value={exRest} onChange={(e) => setExRest(e.target.value)} />
                    </div>
                    <Button
                      size="sm"
                      className="w-full gap-1"
                      disabled={!exName || addExercise.isPending}
                      onClick={() => addExercise.mutate()}
                    >
                      {addExercise.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      Adicionar
                    </Button>
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
