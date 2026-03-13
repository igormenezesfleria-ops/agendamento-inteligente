import { useState, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Share2, Flame } from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import { startOfWeek, endOfWeek, format, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function getMotivationalTitle(streak: number) {
  if (streak >= 8) return 'Lenda Absoluta! 🏆';
  if (streak >= 4) return 'Semana de Ouro Concluída! 🥇';
  if (streak >= 2) return 'Sequência Imparável! 🔥';
  if (streak >= 1) return 'Primeira Conquista! 💪';
  return 'Hora de Começar! 🚀';
}

const DAY_LABELS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function PerformanceReceipt({ open, onOpenChange }: Props) {
  const { user, profile } = useAuth();
  const receiptRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const streak = (profile as any)?.current_streak ?? 0;

  // Current week boundaries
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const weekDays = useMemo(() => eachDayOfInterval({ start: weekStart, end: weekEnd }), [weekStart.toISOString()]);
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

  // Completed appointments this week (with class_schedule_id for top workout)
  const { data: weekAppointments = [] } = useQuery({
    queryKey: ['gamification-week', user?.id, weekStartStr],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('appointments')
        .select('id, date, class_schedule_id')
        .eq('student_id', user.id)
        .eq('status', 'completed')
        .gte('date', weekStartStr)
        .lte('date', weekEndStr);
      return data || [];
    },
    enabled: !!user?.id && open,
  });

  // Active days this week
  const activeDates = useMemo(() => {
    const set = new Set<string>();
    weekAppointments.forEach((a) => set.add(a.date));
    return set;
  }, [weekAppointments]);

  const minutesTrained = weekAppointments.length * 60;

  // Top workout type
  const { data: topWorkout = 'Musculação' } = useQuery({
    queryKey: ['gamification-top-workout', user?.id, weekStartStr, weekAppointments.length],
    queryFn: async () => {
      if (weekAppointments.length === 0) return 'Musculação';
      const scheduleIds = weekAppointments
        .map((a) => a.class_schedule_id)
        .filter(Boolean) as string[];
      if (scheduleIds.length === 0) return 'Musculação';

      const { data: schedules } = await supabase
        .from('class_schedules')
        .select('id, class_name')
        .in('id', scheduleIds);

      if (!schedules || schedules.length === 0) return 'Musculação';

      // Count occurrences
      const countMap = new Map<string, number>();
      const nameMap = new Map<string, string>();
      scheduleIds.forEach((sid) => {
        countMap.set(sid, (countMap.get(sid) || 0) + 1);
      });
      schedules.forEach((s) => nameMap.set(s.id, s.class_name));

      let topId = scheduleIds[0];
      let topCount = 0;
      countMap.forEach((count, id) => {
        if (count > topCount) { topCount = count; topId = id; }
      });
      return nameMap.get(topId) || 'Musculação';
    },
    enabled: weekAppointments.length > 0 && open,
  });

  const title = getMotivationalTitle(streak);

  const handleShare = useCallback(async () => {
    if (!receiptRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(receiptRef.current, {
        backgroundColor: null,
        scale: 3,
        useCORS: true,
      });
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));

      if (blob && navigator.canShare?.({ files: [new File([blob], 'synton.png', { type: 'image/png' })] })) {
        await navigator.share({
          files: [new File([blob], 'synton-infografico.png', { type: 'image/png' })],
          title: 'Meu progresso na Synton',
        });
        toast.success('Compartilhado com sucesso! 🚀');
      } else {
        // Fallback: download
        const link = document.createElement('a');
        link.download = `synton-infografico-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        toast.success('Imagem salva! Agora é só postar nos Stories 🚀');
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        toast.error('Erro ao gerar imagem.');
      }
    } finally {
      setExporting(false);
    }
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 bg-transparent border-none shadow-none [&>button]:text-white [&>button]:top-2 [&>button]:right-2 overflow-y-auto max-h-[95vh]">
        <div className="flex flex-col items-center gap-4 p-4">

          {/* Shareable Card */}
          <div
            ref={receiptRef}
            className="w-full rounded-3xl overflow-hidden"
            style={{ background: 'linear-gradient(165deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}
          >
            <div className="px-6 pt-8 pb-8 space-y-6">

              {/* Logo */}
              <div className="flex justify-center">
                <img
                  src="/logo-synton.png"
                  alt="Synton"
                  className="h-8 object-contain"
                  crossOrigin="anonymous"
                />
              </div>

              {/* Motivational Title */}
              <div className="text-center">
                <p className="text-xl font-black text-white leading-tight tracking-tight">
                  {title}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {profile?.name?.split(' ')[0] || 'Aluno'} · {format(now, "'Semana de' dd MMM", { locale: ptBR })}
                </p>
              </div>

              {/* Big Streak */}
              <div className="flex flex-col items-center py-2">
                <div className="relative">
                  <div
                    className="w-28 h-28 rounded-full flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, rgba(249,115,22,0.25) 0%, rgba(234,88,12,0.1) 100%)',
                      boxShadow: '0 0 40px rgba(249,115,22,0.2)',
                    }}
                  >
                    <div className="text-center">
                      <Flame className="w-8 h-8 text-orange-500 mx-auto mb-0.5" />
                      <span className="text-3xl font-black text-orange-500">{streak}</span>
                    </div>
                  </div>
                </div>
                <p className="text-sm font-bold text-white mt-3">
                  🔥 {streak} Semana{streak !== 1 ? 's' : ''} Seguida{streak !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Divider */}
              <div className="border-t border-slate-700/50" />

              {/* Stats Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl p-4 text-center" style={{ background: 'rgba(249,115,22,0.08)' }}>
                  <p className="text-2xl font-black text-orange-500">{minutesTrained}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mt-1">
                    Minutos Treinados
                  </p>
                </div>
                <div className="rounded-2xl p-4 text-center" style={{ background: 'rgba(249,115,22,0.08)' }}>
                  <p className="text-lg font-black text-white truncate">{topWorkout}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mt-1">
                    Top Treino
                  </p>
                </div>
              </div>

              {/* Mini Calendar — Dias de Aço */}
              <div className="space-y-3">
                <p className="text-[10px] text-orange-500 font-bold uppercase tracking-widest text-center">
                  ⚡ Dias de Aço
                </p>
                <div className="grid grid-cols-7 gap-2">
                  {weekDays.map((day, i) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const isActive = activeDates.has(dateStr);
                    const isToday = isSameDay(day, now);
                    return (
                      <div key={i} className="flex flex-col items-center gap-1">
                        <span className="text-[9px] text-slate-500 font-bold">{DAY_LABELS[i]}</span>
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                            isActive
                              ? 'bg-orange-500 text-white shadow-lg'
                              : isToday
                                ? 'border border-orange-500/40 text-slate-400'
                                : 'bg-slate-800/60 text-slate-600'
                          }`}
                          style={isActive ? { boxShadow: '0 0 12px rgba(249,115,22,0.3)' } : {}}
                        >
                          {format(day, 'd')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="text-center pt-2">
                <p className="text-[9px] text-slate-500">
                  Powered by <span className="text-orange-500 font-bold">Synton</span>
                </p>
              </div>
            </div>
          </div>

          {/* Share Button */}
          <Button
            onClick={handleShare}
            disabled={exporting}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-base py-6 rounded-xl shadow-lg"
            style={{ boxShadow: '0 8px 25px rgba(249,115,22,0.25)' }}
          >
            {exporting ? (
              'Gerando imagem...'
            ) : (
              <>
                <Share2 className="w-5 h-5 mr-2" />
                COMPARTILHAR NOS STORIES
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
