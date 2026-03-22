import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { TIME_SLOTS } from '@/lib/constants';
import { Loader2, CheckCircle2, Calendar, Clock, User } from 'lucide-react';

export function CollaboratorHistory() {
  const { user } = useAuth();

  const { data: history, isLoading } = useQuery({
    queryKey: ['myHistory', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data: appointments, error: appError } = await supabase
        .from('appointments')
        .select('id, date, time_slot, status, student_id, completed_at, attendance')
        .eq('instructor_id', user.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      if (appError) throw appError;
      if (!appointments || appointments.length === 0) return [];

      const studentIds = [...new Set(appointments.map((a) => a.student_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', studentIds);

      const profileMap = new Map((profiles || []).map((p) => [p.id, p.name || 'Aluno']));

      return appointments.map((a) => ({
        ...a,
        studentName: profileMap.get(a.student_id) || 'Aluno',
      }));
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-10 border border-slate-100 shadow-sm text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-xl font-extrabold text-slate-900 mb-2">Nenhum treino concluído</h3>
        <p className="text-slate-500 text-sm">Seus treinos concluídos aparecerão aqui.</p>
      </div>
    );
  }

  // Group by date+time
  const grouped = history.reduce<Record<string, typeof history>>((acc, item) => {
    const key = `${item.date}_${item.time_slot}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">{history.length} treino(s) concluído(s)</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {Object.entries(grouped).map(([key, items], idx) => {
          const first = items[0];
          const slot = TIME_SLOTS.find((s) => s.id === first.time_slot);
          const parsedDate = parseISO(first.date + 'T12:00:00');
          const formattedDate = format(parsedDate, "EEE, d 'de' MMM", { locale: ptBR });

          return (
            <div key={key} className={`p-4 ${idx > 0 ? 'border-t border-slate-50' : ''}`}>
              <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="capitalize">{formattedDate}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{slot?.label || first.time_slot}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-50">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-accent" />
                      <span className="font-semibold text-slate-900 text-sm">{item.studentName}</span>
                    </div>
                    {item.attendance === 'present' && <Badge variant="confirmed" className="text-[10px]">Presente</Badge>}
                    {item.attendance === 'absent' && <Badge variant="destructive" className="text-[10px]">Faltou</Badge>}
                    {(!item.attendance || item.attendance === 'pending') && (
                      <Badge variant="outline" className="text-[10px]">Pendente</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
