import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Props {
  studentId: string;
}

/**
 * Compact metric card shown inside the Trainer's Dossier ("Ficha" tab).
 * Computes month-over-month average load change for the student.
 */
export function LoadEvolutionCard({ studentId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['load-evolution', studentId],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 60);
      const { data, error } = await supabase
        .from('workout_session_loads')
        .select('load_kg, session_date')
        .eq('student_id', studentId)
        .gte('session_date', since.toISOString().split('T')[0])
        .order('session_date', { ascending: false });
      if (error) throw error;
      const rows = (data || []) as Array<{ load_kg: number; session_date: string }>;
      if (rows.length === 0) return { delta: null as number | null, total: 0 };

      const today = new Date();
      const last30Cut = new Date(today);
      last30Cut.setDate(today.getDate() - 30);

      const recent: number[] = [];
      const previous: number[] = [];
      for (const r of rows) {
        const [y, m, d] = r.session_date.split('-').map(Number);
        const dt = new Date(y, m - 1, d);
        const kg = Number(r.load_kg);
        if (!kg) continue;
        if (dt >= last30Cut) recent.push(kg);
        else previous.push(kg);
      }
      if (recent.length === 0 || previous.length === 0) {
        return { delta: null, total: rows.length };
      }
      const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
      const delta = ((avg(recent) - avg(previous)) / avg(previous)) * 100;
      return { delta, total: rows.length };
    },
  });

  const delta = data?.delta;
  const total = data?.total ?? 0;
  const Icon = delta == null ? TrendingUp : delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const color = delta == null ? 'text-primary' : delta > 0 ? 'text-[hsl(var(--success))]' : delta < 0 ? 'text-destructive' : 'text-muted-foreground';
  const valueLabel = isLoading
    ? '…'
    : delta == null
    ? total === 0 ? 'Sem dados' : 'Ver Gráfico'
    : `${delta > 0 ? '+' : ''}${delta.toFixed(0)}%`;

  return (
    <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-muted/40 border border-border/60">
      <Icon className={`w-4 h-4 mb-1 ${color}`} />
      <p className={`text-lg font-bold leading-none ${color}`}>{valueLabel}</p>
      <p className="text-[10px] text-muted-foreground mt-1 text-center leading-tight">Evolução de Carga</p>
    </div>
  );
}