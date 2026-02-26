import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Share2 } from 'lucide-react';
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

function getLevel(count: number) {
  if (count >= 50) return 'MÁQUINA DE PERFORMANCE';
  if (count >= 30) return 'ATLETA DEDICADO';
  if (count >= 15) return 'EM EVOLUÇÃO';
  if (count >= 5) return 'INICIANDO A JORNADA';
  return 'PRIMEIRO PASSO';
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function PerformanceReceipt({ open, onOpenChange }: Props) {
  const { user, profile } = useAuth();
  const [timeframe, setTimeframe] = useState<Timeframe>('30d');
  const receiptRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const { data: trainerProfile } = useQuery({
    queryKey: ['trainer-profile', profile?.business_owner_id],
    queryFn: async () => {
      if (!profile?.business_owner_id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('name, instagram_handle')
        .eq('id', profile.business_owner_id)
        .single();
      return data;
    },
    enabled: !!profile?.business_owner_id,
  });

  const { data: sessionCount = 0 } = useQuery({
    queryKey: ['completed-sessions', user?.id, timeframe],
    queryFn: async () => {
      if (!user?.id) return 0;
      const startDate = getStartDate(timeframe);
      const { count, error } = await supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', user.id)
        .eq('status', 'completed')
        .gte('date', startDate);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user?.id && open,
  });

  const studentInstagram = (profile as any)?.instagram_handle || null;
  const trainerInstagram = trainerProfile?.instagram_handle || null;
  const totalMinutes = sessionCount * 60;
  const level = getLevel(sessionCount);

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
      link.download = `extrato-xaxis-${Date.now()}.png`;
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
            style={{
              clipPath: jaggedTop,
              paddingTop: '16px',
              paddingBottom: '16px',
            }}
          >
            <div className="bg-slate-900 px-6 py-10 space-y-6">
              {/* Header */}
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-black tracking-tight text-white">
                  X <span className="text-orange-500">AXIS</span>
                </h2>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">
                  O app de agendamentos e gestão para o personal
                </p>
              </div>

              {/* Divider */}
              <div className="border-t border-dashed border-slate-700" />

              {/* Profiles */}
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-[10px] text-orange-500 font-bold uppercase tracking-wider mb-1">Aluno</p>
                  <p className="text-sm font-bold text-white truncate">{profile?.name || 'Aluno'}</p>
                  {studentInstagram && (
                    <p className="text-xs text-slate-400 truncate">@{studentInstagram.replace(/^@/, '')}</p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] text-orange-500 font-bold uppercase tracking-wider mb-1">Personal</p>
                  <p className="text-sm font-bold text-white truncate">{trainerProfile?.name || 'Personal'}</p>
                  {trainerInstagram && (
                    <p className="text-xs text-slate-400 truncate">@{trainerInstagram.replace(/^@/, '')}</p>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-dashed border-slate-700" />

              {/* Stats */}
              <div className="text-center space-y-4">
                <div>
                  <p className="text-5xl font-black text-orange-500">{sessionCount}x</p>
                  <p className="text-sm text-slate-300 font-semibold mt-1">Sessões Concluídas</p>
                </div>
                <div className="flex justify-center gap-8">
                  <div>
                    <p className="text-2xl font-black text-white">{totalMinutes}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Total Minutos</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-white">{TIMEFRAME_LABELS[timeframe]}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Período</p>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-dashed border-slate-700" />

              {/* Stamp */}
              <div className="relative flex justify-center py-4">
                <div
                  className="border-4 border-orange-500 rounded-lg px-6 py-3 text-center"
                  style={{ transform: 'rotate(-6deg)' }}
                >
                  <p className="text-[10px] text-orange-400 font-bold uppercase tracking-widest">Nível</p>
                  <p className="text-lg font-black text-orange-500 leading-tight">{level}</p>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center space-y-1 pt-2">
                <p className="text-[9px] text-slate-500 leading-relaxed">
                  Avaliado e aprovado pela análise de desempenho X AXIS.
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
