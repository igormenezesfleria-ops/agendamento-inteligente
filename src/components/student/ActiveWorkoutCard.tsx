import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dumbbell, Loader2 } from 'lucide-react';

export function ActiveWorkoutCard() {
  const { user } = useAuth();

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
        .select('id, name, sets, reps, rest')
        .eq('workout_id', data.id)
        .order('sort_order');
      if (exErr) throw exErr;

      return { ...data, exercises: exercises || [] };
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-5 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-accent" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-5 h-5 text-accent" />
          <h3 className="font-display text-lg text-foreground">Ficha de Treino Atual</h3>
        </div>

        {!workout ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum treino prescrito.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="font-semibold text-foreground">{workout.title}</p>
              <Badge className="bg-green-600 text-white text-[10px]">Ativo</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {workout.start_date} → {workout.end_date}
            </p>

            {workout.exercises.length === 0 ? (
              <p className="text-xs text-muted-foreground">Exercícios serão adicionados em breve.</p>
            ) : (
              <div className="space-y-2">
                {workout.exercises.map((ex, i) => (
                  <div key={ex.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <span className="text-xs font-bold text-accent mt-0.5">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{ex.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {ex.sets} séries × {ex.reps} reps{ex.rest ? ` · ${ex.rest} descanso` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
