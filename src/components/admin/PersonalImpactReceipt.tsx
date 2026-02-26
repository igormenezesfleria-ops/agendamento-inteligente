import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Share2 } from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';

type Timeframe = '7d' | '30d' | '12m';

const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  '7d': '7 Dias',
  '30d': '30 Dias',
  '12m': '12 Meses',
};

function getStartDate(tf: Timeframe): string {
  const now = new Date();
  if (tf === '7d') now.setDate(now.getDate() - 7);
  else if (tf === '30d') now.setDate(now.getDate() - 30);
  else now.setFullYear(now.getFullYear() - 1);
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getTrainerLevel(count: number) {
  if (count >= 100) return 'TREINADOR DE ELITE 🚀';
  if (count >= 50) return 'TREINADOR DEDICADO 💪';
  if (count >= 20) return 'EM CRESCIMENTO 📈';
  return 'INICIANDO A JORNADA 🌱';
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function PersonalImpactReceipt({ open, onOpenChange }: Props) {
  const { user, profile } = useAuth();
  const [timeframe, setTimeframe] = useState<Timeframe>('30d');
  const receiptRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const startDate = getStartDate(timeframe);

  const { data: completedAppts = [] } = useQuery({
    queryKey: ['admin-impact-sessions', user?.id, timeframe],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('appointments')
        .select('id, student_id')
        .eq('status', 'completed')
        .gte('date', startDate)
        .or(`instructor_id.eq.${user.id},student_id.in.(select id from profiles where business_owner_id = '${user.id}')`);

      if (error) {
        // Fallback: query by instructor_id only, then also get own students
        const { data: byInstructor, error: e2 } = await supabase
          .from('appointments')
          .select('id, student_id')
          .eq('instructor_id', user.id)
          .eq('status', 'completed')
          .gte('date', startDate);
        if (e2) throw e2;

        const { data: byStudents } = await supabase
          .from('profiles')
          .select('id')
          .eq('business_owner_id', user.id);

        const studentIds = new Set((byStudents || []).map((s) => s.id));

        const { data: byOwner } = await supabase
          .from('appointments')
          .select('id, student_id')
          .eq('status', 'completed')
          .gte('date', startDate)
          .in('student_id', Array.from(studentIds));

        const allMap = new Map<string, { id: string; student_id: string }>();
        (byInstructor || []).forEach((a) => allMap.set(a.id, a));
        (byOwner || []).forEach((a) => allMap.set(a.id, a));
        return Array.from(allMap.values());
      }
      return data || [];
    },
    enabled: !!user?.id && open,
  });

  const sessionCount = completedAppts.length;
  const uniqueStudents = new Set(completedAppts.map((a) => a.student_id)).size;
  const hoursWorked = sessionCount; // 1 session = 1 hour

  // Top students
  const { data: topStudents = [] } = useQuery({
    queryKey: ['admin-impact-top', user?.id, timeframe, completedAppts.length],
    queryFn: async () => {
      if (completedAppts.length === 0) return [];
      const countMap = new Map<string, number>();
      completedAppts.forEach((a) => {
        countMap.set(a.student_id, (countMap.get(a.student_id) || 0) + 1);
      });
      const sorted = Array.from(countMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      const ids = sorted.map((s) => s[0]);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', ids);

      const profileMap = new Map((profiles || []).map((p) => [p.id, p.name || 'Aluno']));
      return sorted.map(([id, count]) => ({
        name: profileMap.get(id) || 'Aluno',
        count,
      }));
    },
    enabled: completedAppts.length > 0 && open,
  });

  const personalInstagram = (profile as any)?.instagram_handle || null;
  const level = getTrainerLevel(sessionCount);

  const handleExport = useCallback(async () => {
    if (!receiptRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(receiptRef.current, {
        backgroundColor: null,
        scale: 3,
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = `relatorio-xaxis-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Imagem salva! Agora é só postar nos Stories 🚀');
    } catch {
      toast.error('Erro ao gerar imagem.');
    } finally {
      setExporting(false);
    }
  }, []);

  const jaggedTop =
    "polygon(0% 4%, 2% 0%, 4% 4%, 6% 0%, 8% 4%, 10% 0%, 12% 4%, 14% 0%, 16% 4%, 18% 0%, 20% 4%, 22% 0%, 24% 4%, 26% 0%, 28% 4%, 30% 0%, 32% 4%, 34% 0%, 36% 4%, 38% 0%, 40% 4%, 42% 0%, 44% 4%, 46% 0%, 48% 4%, 50% 0%, 52% 4%, 54% 0%, 56% 4%, 58% 0%, 60% 4%, 62% 0%, 64% 4%, 66% 0%, 68% 4%, 70% 0%, 72% 4%, 74% 0%, 76% 4%, 78% 0%, 80% 4%, 82% 0%, 84% 4%, 86% 0%, 88% 4%, 90% 0%, 92% 4%, 94% 0%, 96% 4%, 98% 0%, 100% 4%, 100% 96%, 98% 100%, 96% 96%, 94% 100%, 92% 96%, 90% 100%, 88% 96%, 86% 100%, 84% 96%, 82% 100%, 80% 96%, 78% 100%, 76% 96%, 74% 100%, 72% 96%, 70% 100%, 68% 96%, 66% 100%, 64% 96%, 62% 100%, 60% 96%, 58% 100%, 56% 96%, 54% 100%, 52% 96%, 50% 100%, 48% 96%, 46% 100%, 44% 96%, 42% 100%, 40% 96%, 38% 100%, 36% 96%, 34% 100%, 32% 96%, 30% 100%, 28% 96%, 26% 100%, 24% 96%, 22% 100%, 20% 96%, 18% 100%, 16% 96%, 14% 100%, 12% 96%, 10% 100%, 8% 96%, 6% 100%, 4% 96%, 2% 100%, 0% 96%)";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 bg-transparent border-none shadow-none [&>button]:text-white [&>button]:top-2 [&>button]:right-2 overflow-y-auto max-h-[95vh]">
        <div className="flex flex-col items-center gap-4 p-4">
          {/* Timeframe Toggle */}
          <div className="flex gap-1 bg-slate-800 rounded-full p-1">
            {(Object.entries(TIMEFRAME_LABELS) as [Timeframe, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTimeframe(key)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  timeframe === key
                    ? 'bg-orange-500 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Receipt */}
          <div
            ref={receiptRef}
            className="w-full"
            style={{ clipPath: jaggedTop, paddingTop: '16px', paddingBottom: '16px' }}
          >
            <div className="bg-slate-900 px-6 py-10 space-y-6">
              {/* Header */}
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-black tracking-tight text-white">
                  X <span className="text-orange-500">AXIS</span>
                </h2>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">
                  Relatório de Impacto Mensal
                </p>
              </div>

              <div className="border-t border-dashed border-slate-700" />

              {/* Profile */}
              <div className="text-center">
                <p className="text-[10px] text-orange-500 font-bold uppercase tracking-wider mb-1">Personal Trainer</p>
                <p className="text-sm font-bold text-white truncate">{profile?.name || 'Personal'}</p>
                {personalInstagram && (
                  <p className="text-xs text-slate-400 truncate">@{personalInstagram.replace(/^@/, '')}</p>
                )}
              </div>

              <div className="border-t border-dashed border-slate-700" />

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-3xl font-black text-orange-500">{sessionCount}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Sessões</p>
                </div>
                <div>
                  <p className="text-3xl font-black text-white">{hoursWorked}h</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Horas</p>
                </div>
                <div>
                  <p className="text-3xl font-black text-white">{uniqueStudents}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Alunos</p>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-700" />

              {/* Top Students */}
              {topStudents.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] text-orange-500 font-bold uppercase tracking-widest text-center">
                    🏆 Top Alunos de Elite
                  </p>
                  <div className="space-y-2">
                    {topStudents.map((s, i) => (
                      <div key={i} className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                          <span className="text-orange-500 font-black text-sm">{i + 1}º</span>
                          <span className="text-sm text-white truncate max-w-[180px]">{s.name}</span>
                        </div>
                        <span className="text-xs text-slate-400 font-bold">{s.count}x</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-dashed border-slate-700" />

              {/* Stamp */}
              <div className="relative flex justify-center py-4">
                <div
                  className="border-4 border-orange-500 rounded-lg px-6 py-3 text-center"
                  style={{ transform: 'rotate(-6deg)' }}
                >
                  <p className="text-[10px] text-orange-400 font-bold uppercase tracking-widest">Status</p>
                  <p className="text-lg font-black text-orange-500 leading-tight">{level}</p>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center space-y-1 pt-2">
                <p className="text-[9px] text-slate-500 leading-relaxed">
                  Gestão de resultados por X AXIS.
                </p>
                <p className="text-[9px] text-slate-500">
                  App oficial: <span className="text-orange-500 font-bold">@xaxis.app</span>
                </p>
              </div>
            </div>
          </div>

          {/* Export Button */}
          <Button
            onClick={handleExport}
            disabled={exporting}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-base py-6 rounded-xl shadow-lg shadow-orange-500/25"
          >
            {exporting ? (
              'Gerando imagem...'
            ) : (
              <>
                <Share2 className="w-5 h-5 mr-2" />
                COMPARTILHAR STORIES
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
