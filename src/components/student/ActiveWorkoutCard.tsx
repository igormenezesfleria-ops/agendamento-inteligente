import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, PlayCircle, Camera, X } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer';
import { VideoModal } from './VideoModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);

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
                    className="py-4 border-b border-border/30 last:border-0 flex justify-between items-start"
                  >
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
                              onClick={() => {
                                setDrawerOpen(false);
                                navigate('/dashboard/biofeedback', {
                                  state: {
                                    movementPattern: ex.movement_pattern,
                                    selectedErrors: ex.selected_errors || [],
                                    exerciseName: ex.name,
                                  },
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
                ))}
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
    </>
  );
}
