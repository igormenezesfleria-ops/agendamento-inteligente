import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Calendar, Flame, Share2, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CheckinQueue } from '@/components/dashboard/CheckinQueue';
import { format, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function CollaboratorDashboard() {
  const { profile, user } = useAuth();

  const firstName = profile?.name?.split(' ')[0] || 'Colaborador';
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();

  const { data: nextSession } = useQuery({
    queryKey: ['collaborator-next-session', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const nowTime = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;

      const { data, error } = await supabase
        .from('appointments')
        .select('id, date, time_slot, status, student_id')
        .eq('instructor_id', user.id)
        .in('status', ['confirmed', 'delegated'])
        .gte('date', todayStr)
        .order('date', { ascending: true })
        .order('time_slot', { ascending: true })
        .limit(5);

      if (error || !data || data.length === 0) return null;

      const upcoming = data.filter((a) => {
        if (a.date > todayStr) return true;
        return a.time_slot >= nowTime;
      });

      if (upcoming.length === 0) return null;

      const appt = upcoming[0];

      // Fetch student name
      const { data: studentProfile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', appt.student_id)
        .single();

      return { ...appt, studentName: studentProfile?.name || 'Aluno' };
    },
    enabled: !!user?.id,
  });

  const { data: weekCount } = useQuery({
    queryKey: ['collaborator-week-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const now = new Date();
      const dayOfWeek = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
      const mondayStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;

      const { count } = await supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('instructor_id', user.id)
        .eq('status', 'completed')
        .gte('date', mondayStr);

      return count || 0;
    },
    enabled: !!user?.id,
  });

  const formatSessionDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    if (isToday(date)) return 'Hoje';
    if (isTomorrow(date)) return 'Amanhã';
    return format(date, "EEEE, dd/MM", { locale: ptBR });
  };

  const getTimeRange = (timeSlot: string) => {
    const [h, m] = timeSlot.split(':').map(Number);
    const end = `${String(h + 1).padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    return `${timeSlot} - ${end}`;
  };

  return (
    <div className="flex flex-col gap-4 animate-fade-in pb-24">
      {/* Greeting */}
      <div className="space-y-1 mb-2">
        <h1 className="text-2xl font-bold text-slate-900">
          Olá, {displayName}! 👋
        </h1>
        <p className="text-sm text-slate-500">
          Confira suas tarefas e treinos delegados.
        </p>
      </div>

      {/* Check-in Validation Queue */}
      <CheckinQueue />

      {/* Next Session Widget */}
      {nextSession ? (
        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Próxima Sessão
          </p>
          <div className="flex items-center justify-between mt-1">
            <p className="text-lg font-bold text-slate-900">
              {nextSession.studentName}
            </p>
            <Link
              to="/dashboard/chat"
              className="bg-slate-50 text-orange-500 p-2 rounded-full hover:bg-orange-50 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
            </Link>
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
            <Calendar className="w-3.5 h-3.5" />
            {formatSessionDate(nextSession.date)}, {getTimeRange(nextSession.time_slot)}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-5 text-center">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Próxima Sessão
          </p>
          <p className="text-sm text-muted-foreground">
            Nenhuma sessão agendada no momento.
          </p>
        </div>
      )}

      {/* Gamification Card — minimal white */}
      <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center text-orange-500 shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Ofensiva de Aulas!</h3>
            <p className="text-sm text-slate-500">
              {weekCount || 0} {(weekCount || 0) === 1 ? 'sessão concluída' : 'sessões concluídas'} esta semana
            </p>
          </div>
        </div>
        <button
          type="button"
          className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl py-3 px-4 transition-all active:scale-[0.99]"
        >
          <Share2 className="w-4 h-4" />
          Compartilhar Impacto
        </button>
      </div>

      {/* Privacy notice */}
      <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-5">
        <h3 className="text-base font-bold text-slate-900 mb-1">🔒 Privacidade</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Por questões de privacidade, você só tem acesso aos treinos especificamente
          delegados a você pelo administrador.
        </p>
      </div>
    </div>
  );
}
