import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, PlayCircle, X } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer';
import { VideoModal } from './VideoModal';

interface Exercise {
  id: string;
  name: string;
  sets: string;
  reps: string;
  rest: string;
  video_url: string;
}

export function ActiveWorkoutCard() {
  const { user } = useAuth();
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
        .select('id, name, sets, reps, rest, video_url')
        .eq('workout_id', data.id)
        .order('sort_order');
      if (exErr) throw exErr;

      return { ...data, exercises: (exercises || []) as Exercise[] };
    },
    enabled: !!user?.id,
  });

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

            <div className="bg-accent/10 border-l-4 border-accent text-accent-foreground/80 text-sm p-3 rounded-r-lg mb-6">
              <strong>Nota do Personal:</strong> Capricha na carga hoje! Foca na postura.
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
                        {ex.video_url && (
                          <button
                            onClick={() => setActiveVideoUrl(ex.video_url)}
                            className="flex items-center gap-1 text-accent hover:text-accent/80 text-xs mt-1.5 font-bold transition-all"
                          >
                            <PlayCircle className="w-4 h-4" /> Ver execução
                          </button>
                        )}
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

            <p className="text-xs text-muted-foreground mt-6 text-center">
              {workout.start_date} → {workout.end_date}
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
