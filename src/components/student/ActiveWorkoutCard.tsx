import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, PlayCircle, Camera, X, Dumbbell, CheckCircle2, History } from 'lucide-react';
import { toast } from 'sonner';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer';
import { VideoModal } from './VideoModal';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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

export function ActiveWorkoutCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [loads, setLoads] = useState<Record<string, string>>({});
  const [consultantTarget, setConsultantTarget] = useState<{
    movementPattern: string;
    selectedErrors: string[];
    exerciseName: string;
    exerciseType: ExerciseType;
  } | null>(null);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const { data: workout, isLoading } = useQuery({
    queryKey: ['active-workout', user?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('workouts')
        .select('id, title, start_date, end_date')
        .eq('student_id', user!.id)
        .eq('is_active', true)
        .lte('start_date', today)
        .gte('end_date', today)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      const { data: exercises, error: exErr } = await supabase
        .from('workout_exercises')
        .select('id, name, sets, reps, rest, video_url, ai_enabled, movement_pattern, selected_errors')
        .eq('workout_id', data.id)
        .order('sort_order');
      if (exErr) throw exErr;

      return { ...data, exercises: (exercises || []) as Exercise[] };
    },
    enabled: !!user?.id,
  });

  // Fetch full load history per exercise (so input pre-fills with last weight and we can show history)
  const { data: loadHistory } = useQuery({
    queryKey: ['load-history', user?.id, workout?.id],
    queryFn: async () => {
      if (!workout?.exercises?.length) return {} as Record<string, Array<{ load: number; date: string }>>;
      const ids = workout.exercises.map((e) => e.id);
      const { data, error } = await supabase
        .from('workout_session_loads')
        .select('exercise_id, load_kg, session_date')
        .eq('student_id', user!.id)
        .in('exercise_id', ids)
        .order('session_date', { ascending: false });
      if (error) throw error;
      const map: Record<string, Array<{ load: number; date: string }>> = {};
      for (const row of (data || []) as any[]) {
        if (!map[row.exercise_id]) map[row.exercise_id] = [];
        map[row.exercise_id].push({ load: Number(row.load_kg), date: row.session_date });
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

  // Pre-populate input state when latest loads or workout changes
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
      if (rows.length === 0) return;
      const { error } = await supabase.from('workout_session_loads').insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Treino salvo! Cargas registradas.');
      qc.invalidateQueries({ queryKey: ['load-history'] });
      setDrawerOpen(false);
    },
    onError: () => toast.error('Erro ao salvar cargas do treino.'),
  });

  // Allow the bottom tab "Treino" button to open the workout drawer
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

  if (!workout) return null;

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

      {/* Bottom Sheet Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="h-[85vh]">
          <div className="p-6 overflow-y-auto flex-1">
            <div className="flex items-center justify-between mb-6">
              <DrawerHeader className="p-0">
                <DrawerTitle className="text-2xl font-extrabold text-foreground">
                  {workout.title}
                </DrawerTitle>
              </DrawerHeader>
              <DrawerClose className="rounded-full p-2 hover:bg-muted transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </DrawerClose>
            </div>

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
              <div>
                {workout.exercises.map((ex, i) => (
                  <div
                    key={ex.id}
                    className="py-4 border-b border-border/30 last:border-0"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3 min-w-0">
                      <span className="text-xs font-bold text-accent w-5 text-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="font-semibold text-foreground truncate block">{ex.name}</span>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          {ex.video_url && (
                            <button
                              onClick={() => setActiveVideoUrl(ex.video_url)}
                              className="flex items-center gap-1 text-accent hover:text-accent/80 text-xs font-bold transition-all"
                            >
                              <PlayCircle className="w-4 h-4" /> Ver execução
                            </button>
                          )}
                          {ex.ai_enabled && ex.movement_pattern && (
                            <button
                              type="button"
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setConsultantTarget({
                                  movementPattern: ex.movement_pattern as string,
                                  selectedErrors: ex.selected_errors || [],
                                  exerciseName: ex.name,
                                  exerciseType: resolveExerciseType(ex.movement_pattern as string, ex.name),
                                });
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-600 hover:bg-orange-100 rounded-full text-xs font-semibold border border-orange-200/70 transition-all dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900/50 dark:hover:bg-orange-950/50"
                            >
                              <Camera className="w-3.5 h-3.5" /> Auto-Gravar AI
                            </button>
                          )}
                        </div>
                      </div>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                      <p className="text-accent font-extrabold text-sm">
                        {ex.sets}×{ex.reps}
                      </p>
                      {ex.rest && (
                        <p className="text-muted-foreground text-xs">{ex.rest} desc.</p>
                      )}
                      </div>
                    </div>
                    {/* Carga input */}
                    <div className="mt-3 ml-8 flex items-center gap-2">
                      <Dumbbell className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <label className="text-xs text-muted-foreground shrink-0">Carga (kg)</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.5"
                        value={loads[ex.id] ?? ''}
                        onChange={(e) => setLoads((prev) => ({ ...prev, [ex.id]: e.target.value }))}
                        placeholder="0"
                        className="w-20 h-9 px-2.5 rounded-lg bg-muted/50 border border-border/60 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                      />
                      {loadHistory?.[ex.id] && loadHistory[ex.id].length > 0 && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              aria-label="Histórico de cargas"
                              className="inline-flex items-center justify-center w-7 h-7 rounded-full text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors"
                            >
                              <History className="w-4 h-4" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent align="end" className="w-52 p-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                              Últimas cargas
                            </p>
                            <ul className="space-y-1.5">
                              {loadHistory[ex.id].slice(0, 3).map((entry, idx) => {
                                const [y, m, d] = entry.date.split('-').map(Number);
                                const label = format(new Date(y, m - 1, d), 'dd/MM', { locale: ptBR });
                                return (
                                  <li key={idx} className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">{label}</span>
                                    <span className="font-semibold text-foreground">{entry.load}kg</span>
                                  </li>
                                );
                              })}
                            </ul>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </div>
                ))}
                {/* Concluir Treino CTA */}
                <button
                  type="button"
                  onClick={() => completeMutation.mutate()}
                  disabled={completeMutation.isPending}
                  className="mt-6 w-full bg-accent hover:bg-accent/90 disabled:opacity-60 text-accent-foreground font-bold rounded-2xl py-4 flex items-center justify-center gap-2 transition-all"
                >
                  {completeMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <><CheckCircle2 className="w-5 h-5" /> Concluir Treino</>
                  )}
                </button>
              </div>
            )}

            <p className="text-xs text-gray-500 dark:text-muted-foreground mt-6 text-center">
              Válido até {(() => {
                const [y, m, d] = workout.end_date.split('-').map(Number);
                return format(new Date(y, m - 1, d), "dd 'de' MMMM", { locale: ptBR });
              })()}
            </p>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Video Modal */}
      {activeVideoUrl && (
        <VideoModal videoUrl={activeVideoUrl} onClose={() => setActiveVideoUrl(null)} />
      )}

      {/* Consultor Synton — pre-evaluation setup modal */}
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
