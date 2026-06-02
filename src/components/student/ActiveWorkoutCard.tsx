import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Loader2,
  PlayCircle,
  Camera,
  X,
  Dumbbell,
  CheckCircle2,
  History,
  Play,
  Timer,
  Check,
  ChevronRight,
  Share2,
  Home,
  Flame,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SyntonConsultantModal, resolveExerciseType, type ExerciseType } from './SyntonConsultantModal';

interface Exercise {
  id: string;
  name: string;
  sets: string;
  reps: string;
  rest: string;
  video_url: string;
  ai_enabled: boolean;
  movement_pattern: string | null;
  selected_errors: string[] | null;
}

function extractYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  );
  return m ? m[1] : null;
}

function formatElapsed(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function ActiveWorkoutCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loads, setLoads] = useState<Record<string, string>>({});
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const [detailExercise, setDetailExercise] = useState<Exercise | null>(null);
  const [detailTab, setDetailTab] = useState<'execucao' | 'carga'>('execucao');
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState<Record<string, boolean>>({});
  const [savingLoad, setSavingLoad] = useState<Record<string, boolean>>({});
  const [summary, setSummary] = useState<null | {
    elapsedMs: number;
    workoutTitle: string;
    highlights: Array<{ name: string; diff: number; load: number }>;
    totalExercises: number;
  }>(null);
  const [consultantTarget, setConsultantTarget] = useState<{
    movementPattern: string;
    selectedErrors: string[];
    exerciseName: string;
    exerciseType: ExerciseType;
  } | null>(null);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const { data: workouts, isLoading } = useQuery({
    queryKey: ['active-workouts', user?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('workouts')
        .select('id, title, start_date, end_date, split_label')
        .eq('student_id', user!.id)
        .eq('is_active', true)
        .lte('start_date', today)
        .gte('end_date', today)
        .order('split_label', { ascending: true });
      if (error) throw error;
      if (!data || data.length === 0) return [] as Array<any>;
      const ids = data.map((w) => w.id);
      const { data: allEx, error: exErr } = await supabase
        .from('workout_exercises')
        .select('id, name, sets, reps, rest, video_url, ai_enabled, movement_pattern, selected_errors, workout_id, sort_order')
        .in('workout_id', ids)
        .order('sort_order');
      if (exErr) throw exErr;
      return data.map((w: any) => ({
        ...w,
        exercises: ((allEx || []) as any[])
          .filter((e) => e.workout_id === w.id)
          .map(({ workout_id, sort_order, ...rest }) => rest) as Exercise[],
      }));
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (!workouts || workouts.length === 0) {
      setSelectedWorkoutId(null);
      return;
    }
    if (!selectedWorkoutId || !workouts.find((w: any) => w.id === selectedWorkoutId)) {
      setSelectedWorkoutId(workouts[0].id);
    }
  }, [workouts]);

  const workout = useMemo(
    () => (workouts || []).find((w: any) => w.id === selectedWorkoutId) || null,
    [workouts, selectedWorkoutId],
  );

  // Load history per exercise — ordered by exact created_at timestamp (most recent first).
  const { data: loadHistory } = useQuery({
    queryKey: ['load-history', user?.id, workout?.id],
    queryFn: async () => {
      if (!workout?.exercises?.length) {
        return {} as Record<string, Array<{ load: number; date: string; ts: number }>>;
      }
      const ids = workout.exercises.map((e) => e.id);
      const { data, error } = await supabase
        .from('workout_session_loads')
        .select('exercise_id, load_kg, session_date, created_at')
        .eq('student_id', user!.id)
        .in('exercise_id', ids)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const map: Record<string, Array<{ load: number; date: string; ts: number }>> = {};
      for (const row of (data || []) as any[]) {
        if (!map[row.exercise_id]) map[row.exercise_id] = [];
        map[row.exercise_id].push({
          load: Number(row.load_kg),
          date: row.session_date,
          ts: new Date(row.created_at).getTime(),
        });
      }
      // Strict descending sort by exact timestamp so the absolute most recent is on top.
      for (const k of Object.keys(map)) {
        map[k].sort((a, b) => b.ts - a.ts);
      }
      return map;
    },
    enabled: !!user?.id && !!workout?.id,
  });

  const latestLoads: Record<string, number> = {};
  if (loadHistory) {
    for (const [k, arr] of Object.entries(loadHistory)) {
      if (arr.length > 0) latestLoads[k] = arr[0].load;
    }
  }

  useEffect(() => {
    if (!workout?.exercises) return;
    setLoads((prev) => {
      const next = { ...prev };
      for (const ex of workout.exercises) {
        if (next[ex.id] === undefined) {
          const last = loadHistory?.[ex.id]?.[0]?.load;
          next[ex.id] = last !== undefined ? String(last) : '';
        }
      }
      return next;
    });
  }, [workout?.id, loadHistory]);

  // Live ticking timer
  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!workout || !user?.id) return;
      const rows = workout.exercises
        .map((ex) => ({
          student_id: user.id,
          workout_id: workout.id,
          exercise_id: ex.id,
          session_date: todayStr,
          load_kg: parseFloat((loads[ex.id] || '').replace(',', '.')) || 0,
        }))
        .filter((r) => r.load_kg > 0);
      if (rows.length > 0) {
        const { error } = await supabase.from('workout_session_loads').insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      const elapsedMs = startedAt ? Date.now() - startedAt : 0;
      const highlights: Array<{ name: string; diff: number; load: number }> = [];
      if (workout) {
        for (const ex of workout.exercises) {
          const todays = parseFloat((loads[ex.id] || '').replace(',', '.')) || 0;
          if (todays <= 0) continue;
          const history = loadHistory?.[ex.id] || [];
          const previousBest = history.reduce((max, h) => (h.load > max ? h.load : max), 0);
          if (previousBest > 0 && todays > previousBest) {
            highlights.push({ name: ex.name, diff: +(todays - previousBest).toFixed(2), load: todays });
          }
        }
      }
      setSummary({
        elapsedMs,
        workoutTitle: workout?.title || 'Treino',
        highlights,
        totalExercises: workout?.exercises.length || 0,
      });
      setStartedAt(null);
      setCompleted({});
      qc.invalidateQueries({ queryKey: ['load-history'] });
      setDrawerOpen(false);
    },
    onError: () => toast.error('Erro ao salvar cargas do treino.'),
  });

  const saveSingleLoad = async (exerciseId: string) => {
    if (!workout || !user?.id) return;
    const raw = (loads[exerciseId] || '').replace(',', '.');
    const value = parseFloat(raw);
    if (!value || value <= 0) {
      toast.error('Informe uma carga válida.');
      return;
    }
    setSavingLoad((p) => ({ ...p, [exerciseId]: true }));
    const { error } = await supabase.from('workout_session_loads').insert({
      student_id: user.id,
      workout_id: workout.id,
      exercise_id: exerciseId,
      session_date: todayStr,
      load_kg: value,
    });
    setSavingLoad((p) => ({ ...p, [exerciseId]: false }));
    if (error) {
      toast.error('Erro ao salvar carga.');
      return;
    }
    setSavedFlash((p) => ({ ...p, [exerciseId]: true }));
    setTimeout(() => setSavedFlash((p) => ({ ...p, [exerciseId]: false })), 2000);
    qc.invalidateQueries({ queryKey: ['load-history'] });
  };

  useEffect(() => {
    const handler = () => {
      if (workout) setDrawerOpen(true);
    };
    window.addEventListener('open-active-workout', handler);
    return () => window.removeEventListener('open-active-workout', handler);
  }, [workout]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-accent" />
      </div>
    );
  }

  if (!workouts || workouts.length === 0 || !workout) return null;

  const elapsedLabel = startedAt ? formatElapsed(now - startedAt) : null;
  const totalCount = workout.exercises.length;
  const completedCount = workout.exercises.filter((e) => completed[e.id]).length;

  return (
    <>
      {/* Trigger card */}
      <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-sm flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Seu Plano de Treino Atual</p>
          <p className="text-base font-bold text-accent truncate">{workout.title}</p>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          className="bg-accent hover:bg-accent/90 text-accent-foreground px-5 py-2.5 rounded-xl font-bold text-sm transition-all shrink-0"
        >
          Ver Ficha Completa
        </button>
      </div>

      {/* Workout Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="h-[90vh]">
          <div className="p-6 overflow-y-auto flex-1 pb-32">
            <div className="flex items-start justify-between mb-4">
              <DrawerHeader className="p-0">
                <DrawerTitle className="text-2xl font-extrabold text-foreground">
                  {workout.title}
                </DrawerTitle>
                {totalCount > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {completedCount} de {totalCount} concluídos
                  </p>
                )}
              </DrawerHeader>
              <DrawerClose className="rounded-full p-2 hover:bg-muted transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </DrawerClose>
            </div>

            {/* Timer / Start CTA */}
            {startedAt ? (
              <div className="mb-5 bg-gradient-to-br from-accent/15 to-accent/5 border border-accent/30 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                    <Timer className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Em andamento
                    </p>
                    <p className="text-2xl font-extrabold tabular-nums text-foreground">{elapsedLabel}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStartedAt(null)}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted/60 transition-colors"
                >
                  Parar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setStartedAt(Date.now());
                  setNow(Date.now());
                }}
                className="mb-5 w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold rounded-2xl py-3.5 flex items-center justify-center gap-2 transition-all shadow-md shadow-accent/20"
              >
                <Play className="w-4 h-4 fill-current" /> Iniciar Treino
              </button>
            )}

            <div className="bg-zinc-50 dark:bg-zinc-900/40 border border-border/60 text-sm text-foreground/80 p-3.5 rounded-xl mb-6">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Nota do Personal
              </p>
              <p>Capricha na carga hoje! Foca na postura.</p>
            </div>

            {workout.exercises.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Exercícios serão adicionados em breve.
              </p>
            ) : (
              <div className="space-y-3">
                {workout.exercises.map((ex, i) => (
                  <ExerciseCard
                    key={ex.id}
                    ex={ex}
                    index={i}
                    isCompleted={!!completed[ex.id]}
                    onToggleComplete={() =>
                      setCompleted((prev) => ({ ...prev, [ex.id]: !prev[ex.id] }))
                    }
                    onOpenDetail={() => {
                      setDetailExercise(ex);
                      setDetailTab('execucao');
                    }}
                    latestLoad={latestLoads[ex.id]}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => completeMutation.mutate()}
                  disabled={completeMutation.isPending}
                  className="mt-6 w-full bg-accent hover:bg-accent/90 disabled:opacity-60 text-accent-foreground font-bold rounded-2xl py-4 flex items-center justify-center gap-2 transition-all"
                >
                  {completeMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" /> Concluir Treino
                    </>
                  )}
                </button>
              </div>
            )}

            <p className="text-xs text-gray-500 dark:text-muted-foreground mt-6 text-center">
              Válido até{' '}
              {(() => {
                const [y, m, d] = workout.end_date.split('-').map(Number);
                return format(new Date(y, m - 1, d), "dd 'de' MMMM", { locale: ptBR });
              })()}
            </p>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Native-style exercise detail bottom sheet */}
      <Drawer
        open={!!detailExercise}
        onOpenChange={(o) => !o && setDetailExercise(null)}
      >
        <DrawerContent className="h-[90vh]">
          {detailExercise && (
            <div className="flex-1 overflow-y-auto pb-32">
              {/* Video / thumbnail header */}
              <div className="relative w-full aspect-video bg-black">
                {(() => {
                  const vid = extractYouTubeId(detailExercise.video_url);
                  if (vid) {
                    return (
                      <iframe
                        src={`https://www.youtube.com/embed/${vid}?rel=0`}
                        className="absolute inset-0 w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={detailExercise.name}
                      />
                    );
                  }
                  return (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-700">
                      <PlayCircle className="w-16 h-16 text-white/40" />
                    </div>
                  );
                })()}
                <DrawerClose className="absolute top-3 right-3 rounded-full bg-black/50 hover:bg-black/70 p-2 transition-colors">
                  <X className="w-5 h-5 text-white" />
                </DrawerClose>
              </div>

              <div className="p-6">
                <div className="flex items-start justify-between gap-4 mb-1">
                  <h2 className="text-2xl font-extrabold text-foreground leading-tight">
                    {detailExercise.name}
                  </h2>
                  <span className="shrink-0 text-accent font-extrabold text-base">
                    {detailExercise.sets}×{detailExercise.reps}
                  </span>
                </div>
                {detailExercise.rest && (
                  <p className="text-xs text-muted-foreground mb-5">
                    Descanso: {detailExercise.rest}
                  </p>
                )}

                <Tabs
                  value={detailTab}
                  onValueChange={(v) => setDetailTab(v as 'execucao' | 'carga')}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2 mb-5">
                    <TabsTrigger value="execucao">Execução</TabsTrigger>
                    <TabsTrigger value="carga">Progressão de Carga</TabsTrigger>
                  </TabsList>

                  <TabsContent value="execucao" className="space-y-3 mt-0">
                    {detailExercise.ai_enabled && detailExercise.movement_pattern ? (
                      <button
                        type="button"
                        onClick={() => {
                          setConsultantTarget({
                            movementPattern: detailExercise.movement_pattern as string,
                            selectedErrors: detailExercise.selected_errors || [],
                            exerciseName: detailExercise.name,
                            exerciseType: resolveExerciseType(
                              detailExercise.movement_pattern as string,
                              detailExercise.name,
                            ),
                          });
                        }}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/30 dark:hover:bg-orange-950/50 rounded-2xl border border-orange-200/70 dark:border-orange-900/50 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                            <Camera className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                          </div>
                          <div className="text-left">
                            <p className="font-bold text-sm text-orange-700 dark:text-orange-300">
                              Auto-Gravar AI
                            </p>
                            <p className="text-[11px] text-orange-600/80 dark:text-orange-400/80">
                              Análise biomecânica em tempo real
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-orange-500" />
                      </button>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        Análise por IA não disponível para este exercício.
                      </p>
                    )}

                    <div className="bg-muted/40 rounded-2xl p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        Dica
                      </p>
                      <p className="text-sm text-foreground/80">
                        Assista ao vídeo acima antes de começar e mantenha a forma correta em todas
                        as repetições.
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="carga" className="space-y-4 mt-0">
                    <div className="bg-muted/40 rounded-2xl p-4">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Carga de hoje (kg)
                      </label>
                      <div className="flex items-center gap-2 mt-2">
                        <Dumbbell className="w-5 h-5 text-accent" />
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.5"
                          value={loads[detailExercise.id] ?? ''}
                          onChange={(e) =>
                            setLoads((prev) => ({ ...prev, [detailExercise.id]: e.target.value }))
                          }
                          placeholder="0"
                          className="flex-1 h-12 px-3 rounded-xl bg-background border border-border text-xl font-extrabold text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                        />
                        <span className="text-base font-semibold text-muted-foreground">kg</span>
                      </div>
                    </div>

                    {loadHistory?.[detailExercise.id] && loadHistory[detailExercise.id].length > 0 ? (
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                          <History className="w-3.5 h-3.5" /> Últimas cargas
                        </p>
                        <ul className="space-y-1.5">
                          {loadHistory[detailExercise.id].slice(0, 6).map((entry, idx) => {
                            const d = new Date(entry.ts);
                            const label = format(d, "dd/MM 'às' HH:mm", { locale: ptBR });
                            return (
                              <li
                                key={idx}
                                className="flex items-center justify-between text-sm px-3 py-2.5 rounded-xl bg-muted/40"
                              >
                                <span className="text-muted-foreground">{label}</span>
                                <span className="font-bold text-foreground">{entry.load} kg</span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhuma carga registrada ainda.
                      </p>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>

      {/* Consultor Synton */}
      <SyntonConsultantModal
        open={!!consultantTarget}
        exerciseType={consultantTarget?.exerciseType ?? 'generic'}
        exerciseName={consultantTarget?.exerciseName}
        onClose={() => setConsultantTarget(null)}
        onConfirm={() => {
          if (!consultantTarget) return;
          const target = consultantTarget;
          setConsultantTarget(null);
          setDrawerOpen(false);
          setDetailExercise(null);
          navigate('/dashboard/biofeedback', {
            state: {
              movementPattern: target.movementPattern,
              selectedErrors: target.selectedErrors,
              exerciseName: target.exerciseName,
            },
          });
        }}
      />
    </>
  );
}

interface ExerciseCardProps {
  ex: Exercise;
  index: number;
  isCompleted: boolean;
  onToggleComplete: () => void;
  onOpenDetail: () => void;
  latestLoad?: number;
}

function ExerciseCard({
  ex,
  index,
  isCompleted,
  onToggleComplete,
  onOpenDetail,
  latestLoad,
}: ExerciseCardProps) {
  return (
    <div
      className={`relative flex items-center gap-3 p-4 rounded-2xl border shadow-sm transition-all ${
        isCompleted
          ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40 opacity-75'
          : 'bg-card border-border/60 hover:border-accent/40'
      }`}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleComplete();
        }}
        aria-label={isCompleted ? 'Desmarcar exercício' : 'Marcar como concluído'}
        className={`shrink-0 w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all ${
          isCompleted
            ? 'bg-emerald-500 border-emerald-500 text-white'
            : 'border-border hover:border-accent'
        }`}
      >
        {isCompleted ? (
          <Check className="w-5 h-5" strokeWidth={3} />
        ) : (
          <span className="text-xs font-bold text-muted-foreground">{index + 1}</span>
        )}
      </button>

      <button type="button" onClick={onOpenDetail} className="flex-1 min-w-0 text-left">
        <p
          className={`font-bold text-foreground truncate ${
            isCompleted ? 'line-through text-muted-foreground' : ''
          }`}
        >
          {ex.name}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-xs font-semibold text-accent">
            {ex.sets}×{ex.reps}
          </span>
          {ex.rest && <span className="text-xs text-muted-foreground">· {ex.rest} desc.</span>}
          {latestLoad !== undefined && (
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
              · <Dumbbell className="w-3 h-3" /> {latestLoad}kg
            </span>
          )}
        </div>
      </button>

      <button
        type="button"
        onClick={onOpenDetail}
        aria-label="Abrir detalhes"
        className="shrink-0 w-9 h-9 rounded-full bg-muted/60 hover:bg-accent/10 hover:text-accent flex items-center justify-center text-muted-foreground transition-all"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}
