import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Flame, Download, TrendingUp, Camera } from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import { startOfWeek, endOfWeek, format, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const DAY_LABELS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

function getMotivationalTitle(streak: number) {
  if (streak >= 8) return 'Lenda Absoluta! 🏆';
  if (streak >= 4) return 'Semana de Ouro! 🥇';
  if (streak >= 2) return 'Sequência Imparável! 🔥';
  if (streak >= 1) return 'Primeira Conquista! 💪';
  return 'Hora de Começar! 🚀';
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function EvolutionHub({ open, onOpenChange }: Props) {
  const { user, profile } = useAuth();
  const exportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const streak = (profile as any)?.current_streak ?? 0;
  const longestStreak = (profile as any)?.longest_streak ?? 0;
  const firstName = profile?.name?.split(' ')[0] ?? 'Aluno';

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

  const { data: weekAppointments = [] } = useQuery({
    queryKey: ['evo-hub-week', user?.id, weekStartStr],
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

  const activeDates = new Set(weekAppointments.map(a => a.date));
  const minutesTrained = weekAppointments.length * 60;

  const { data: stats } = useQuery({
    queryKey: ['evo-hub-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return { total: 0, present: 0 };
      const { data } = await supabase
        .from('appointments')
        .select('id, attendance')
        .eq('student_id', user.id)
        .in('attendance', ['present', 'absent']);
      if (!data) return { total: 0, present: 0 };
      return {
        total: data.length,
        present: data.filter(a => a.attendance === 'present').length,
      };
    },
    enabled: !!user?.id && open,
  });

  const presenceRate = stats && stats.total > 0
    ? Math.round((stats.present / stats.total) * 100)
    : 0;

  const handleExport = useCallback(async () => {
    if (!exportRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: null,
        scale: 3,
        useCORS: true,
      });
      const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/png'));
      if (blob && navigator.canShare?.({ files: [new File([blob], 'synton.png', { type: 'image/png' })] })) {
        await navigator.share({
          files: [new File([blob], 'synton-evolucao.png', { type: 'image/png' })],
          title: 'Meu progresso na Synton',
        });
        toast.success('Compartilhado com sucesso! 🚀');
      } else {
        const link = document.createElement('a');
        link.download = `synton-evolucao-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        toast.success('Imagem salva! Agora é só postar nos Stories 🚀');
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') toast.error('Erro ao gerar imagem.');
    } finally {
      setExporting(false);
    }
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 bg-transparent border-none shadow-none [&>button]:text-white [&>button]:top-2 [&>button]:right-2 overflow-y-auto max-h-[95vh]">
        <div className="flex flex-col items-center gap-4 p-4">
          <Tabs defaultValue="ofensiva" className="w-full">
            <TabsList className="w-full grid grid-cols-3 bg-slate-900 border border-slate-700 rounded-xl h-11">
              <TabsTrigger value="ofensiva" className="rounded-lg text-xs font-bold data-[state=active]:bg-accent data-[state=active]:text-accent-foreground text-slate-400">
                <Flame className="w-3.5 h-3.5 mr-1" /> Ofensiva
              </TabsTrigger>
              <TabsTrigger value="medidas" className="rounded-lg text-xs font-bold data-[state=active]:bg-accent data-[state=active]:text-accent-foreground text-slate-400">
                <TrendingUp className="w-3.5 h-3.5 mr-1" /> Medidas
              </TabsTrigger>
              <TabsTrigger value="galeria" className="rounded-lg text-xs font-bold data-[state=active]:bg-accent data-[state=active]:text-accent-foreground text-slate-400">
                <Camera className="w-3.5 h-3.5 mr-1" /> Galeria
              </TabsTrigger>
            </TabsList>

            {/* ===== OFENSIVA TAB ===== */}
            <TabsContent value="ofensiva" className="mt-4 space-y-4">
              {/* Exportable Story Art */}
              <div
                ref={exportRef}
                id="exportable-story-art"
                className="w-full rounded-[2rem] overflow-hidden relative border border-slate-800"
                style={{
                  background: 'linear-gradient(165deg, #0a0a0a 0%, #1a1a2e 40%, #0f0f0f 100%)',
                  aspectRatio: '9/16',
                }}
              >
                <div className="absolute inset-0 flex flex-col justify-between items-center text-center p-8">
                  {/* Top: Logo */}
                  <div className="flex flex-col items-center gap-1 pt-2">
                    <span className="text-2xl font-extrabold text-white tracking-tight">SYNTON</span>
                    <span className="text-[10px] font-semibold text-white/40 uppercase tracking-[0.25em]">
                      Hub de Evolução
                    </span>
                  </div>

                  {/* Center: Big streak glow */}
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className="w-32 h-32 rounded-full flex items-center justify-center"
                      style={{
                        background: 'radial-gradient(circle, rgba(249,115,22,0.25) 0%, transparent 70%)',
                        boxShadow: '0 0 60px rgba(249,115,22,0.2)',
                      }}
                    >
                      <div className="text-center">
                        <span
                          className="text-6xl font-black text-white block"
                          style={{ textShadow: '0 0 20px rgba(249,115,22,0.6)' }}
                        >
                          {streak}
                        </span>
                        <span className="text-base font-bold text-orange-500 uppercase tracking-wider block mt-1">
                          {streak === 1 ? 'Semana Seguida' : 'Semanas Seguidas'}
                        </span>
                      </div>
                    </div>

                    <p className="text-lg font-black text-white mt-2">{getMotivationalTitle(streak)}</p>

                    {/* PSE sub-badge */}
                    <div className="mt-2 bg-white/10 px-4 py-2 rounded-full text-white text-sm backdrop-blur-sm">
                      🔥 Recorde: {longestStreak} semanas · {presenceRate}% presença
                    </div>
                  </div>

                  {/* Mini calendar */}
                  <div className="w-full space-y-3">
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
                              className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${
                                isActive
                                  ? 'bg-orange-500 text-white'
                                  : isToday
                                    ? 'border border-orange-500/40 text-slate-400'
                                    : 'bg-white/5 text-slate-600'
                              }`}
                              style={isActive ? { boxShadow: '0 0 12px rgba(249,115,22,0.3)' } : {}}
                            >
                              {format(day, 'd')}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Watermark */}
                    <div className="text-center pt-3">
                      <p className="text-[9px] text-slate-600">
                        Powered by <span className="text-orange-500 font-bold">Synton</span> · Faça parte do time
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Export button */}
              <button
                onClick={handleExport}
                disabled={exporting}
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground py-4 rounded-xl font-bold text-base shadow-md flex justify-center items-center gap-2 transition-colors"
              >
                {exporting ? 'Gerando imagem...' : (
                  <>
                    <Download className="w-5 h-5" />
                    Baixar para o Instagram
                  </>
                )}
              </button>
            </TabsContent>

            {/* ===== MEDIDAS TAB ===== */}
            <TabsContent value="medidas" className="mt-4">
              <div className="bg-card rounded-2xl p-5 border border-border shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                  Evolução de Peso
                </h3>
                {/* Minimalist chart placeholder using CSS */}
                <div className="relative h-40 flex items-end gap-1.5">
                  {[65, 64.5, 64, 63.8, 63.5, 63.2, 63].map((val, i) => {
                    const max = 66;
                    const min = 62;
                    const pct = ((val - min) / (max - min)) * 100;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[9px] text-muted-foreground font-medium">{val}</span>
                        <div
                          className="w-full rounded-t-md bg-accent/80 transition-all"
                          style={{ height: `${pct}%` }}
                        />
                        <span className="text-[8px] text-muted-foreground">S{i + 1}</span>
                      </div>
                    );
                  })}
                  {/* Trend line overlay (decorative) */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <TrendingUp className="w-16 h-16 text-accent/10" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Dados de exemplo · Em breve com registro real
                </p>
              </div>
            </TabsContent>

            {/* ===== GALERIA TAB ===== */}
            <TabsContent value="galeria" className="mt-4">
              <div className="bg-card rounded-2xl p-5 border border-border shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                  Antes e Depois
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted aspect-[3/4] rounded-xl flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border">
                    <Camera className="w-8 h-8 mb-2 opacity-40" />
                    <span className="text-sm font-medium">Antes</span>
                  </div>
                  <div className="bg-muted aspect-[3/4] rounded-xl flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border">
                    <Camera className="w-8 h-8 mb-2 opacity-40" />
                    <span className="text-sm font-medium">Atual</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Registre sua evolução visual · Em breve com upload
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
