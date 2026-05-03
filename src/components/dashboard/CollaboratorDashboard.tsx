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
    <div className="space-y-5 animate-fade-in pb-32">
      {/* Greeting */}
      <div className="text-center space-y-1 pt-2">
        <h1 className="text-3xl font-extrabold text-foreground">
          Olá, {displayName}! 👋
        </h1>
        <p className="text-muted-foreground text-sm">
          Confira suas tarefas e treinos delegados.
        </p>
      </div>

      {/* Check-in Validation Queue */}
      <CheckinQueue />

      {/* Next Session Widget */}
      {nextSession ? (
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <p className="text-xs font-bold text-orange-500 uppercase tracking-wider">
            Próxima Sessão
          </p>
          <div className="flex items-center justify-between mt-1">
            <p className="text-lg font-bold text-foreground">
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
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm text-center">
          <p className="text-xs font-bold text-orange-500 uppercase tracking-wider mb-1">
            Próxima Sessão
          </p>
          <p className="text-sm text-muted-foreground">
            Nenhuma sessão agendada no momento.
          </p>
        </div>
      )}

      {/* Gamification Card — minimal white */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center text-orange-500 shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">Ofensiva de Aulas!</h3>
            <p className="text-sm text-muted-foreground">
              {weekCount || 0} {(weekCount || 0) === 1 ? 'sessão concluída' : 'sessões concluídas'} esta semana
            </p>
          </div>
        </div>
        <Button
          size="sm"
          className="mt-4 w-full font-semibold text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-xl"
        >
          <Share2 className="w-4 h-4 mr-1.5" />
          Compartilhar Impacto
        </Button>
      </div>

      {/* Privacy notice */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <h3 className="text-base font-bold text-foreground mb-1">🔒 Privacidade</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Por questões de privacidade, você só tem acesso aos treinos especificamente
          delegados a você pelo administrador.
        </p>
      </div>
    </div>
  );
}
