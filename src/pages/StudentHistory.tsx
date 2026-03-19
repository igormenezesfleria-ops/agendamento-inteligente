import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Clock, Inbox } from 'lucide-react';
import { format, parseISO, lastDayOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MonthYearFilter } from '@/components/history/MonthYearFilter';

export default function StudentHistory() {
  const { user } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth(new Date(year, month - 1)).getDate()).padStart(2, '0')}`;

  const { data: history, isLoading } = useQuery({
    queryKey: ['student-full-history', user?.id, month, year],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('appointments')
        .select('id, date, time_slot, status, attendance')
        .eq('student_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .or('status.eq.completed,attendance.eq.present,attendance.eq.absent')
        .order('date', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-display text-3xl text-foreground">Histórico de Treinos</h1>
            <p className="text-muted-foreground">Veja seu histórico de treinos realizados e faltas.</p>
          </div>
          <MonthYearFilter month={month} year={year} onMonthChange={setMonth} onYearChange={setYear} />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : !history || history.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Inbox className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-display text-lg text-foreground mb-2">Nenhum treino registrado</h3>
            <p className="text-muted-foreground">Seu histórico de treinos aparecerá aqui.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{history.length} treino(s) no histórico</p>
            <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
              {history.map((item) => {
                const dateObj = parseISO(item.date + 'T12:00:00');
                const formattedDate = format(dateObj, "EEEE, d 'de' MMMM yyyy", { locale: ptBR });
                return (
                  <div key={item.id} className="flex items-center justify-between py-3 px-4 border-b border-border/30 last:border-0">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-foreground capitalize">{formattedDate}</span>
                      <span className="text-xs text-muted-foreground">{item.time_slot}</span>
                    </div>
                    {item.attendance === 'present' && <Badge variant="confirmed">Presente</Badge>}
                    {item.attendance === 'absent' && <Badge variant="destructive">Faltou</Badge>}
                    {(!item.attendance || item.attendance === 'pending') && <Badge variant="outline">Concluído</Badge>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
