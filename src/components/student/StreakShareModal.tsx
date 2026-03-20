import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Flame, Share2, X } from 'lucide-react';
import { toast } from 'sonner';

interface StreakShareModalProps {
  open: boolean;
  onClose: () => void;
}

export function StreakShareModal({ open, onClose }: StreakShareModalProps) {
  const { profile, user } = useAuth();
  const streak = (profile as any)?.current_streak ?? 0;
  const longestStreak = (profile as any)?.longest_streak ?? 0;
  const firstName = profile?.name?.split(' ')[0] ?? 'Aluno';
  const fullName = profile?.name ?? 'Aluno';

  const { data: stats } = useQuery({
    queryKey: ['streak-share-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return { total: 0, present: 0 };
      const { data, error } = await supabase
        .from('appointments')
        .select('id, attendance')
        .eq('student_id', user.id)
        .in('attendance', ['present', 'absent']);
      if (error) return { total: 0, present: 0 };
      const total = data?.length ?? 0;
      const present = data?.filter(a => a.attendance === 'present').length ?? 0;
      return { total, present };
    },
    enabled: !!user?.id && open,
  });

  const presenceRate = stats && stats.total > 0
    ? Math.round((stats.present / stats.total) * 100)
    : 0;

  const handleShare = () => {
    const text = streak > 0
      ? `🔥 Estou com ${streak} semana${streak > 1 ? 's' : ''} seguida${streak > 1 ? 's' : ''} de treino no Synton! ${stats?.present ?? 0} treinos realizados com ${presenceRate}% de presença. #Synton #Ofensiva`
      : `💪 Comecei minha jornada de treinos no Synton! #Synton`;

    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      toast.success('Copiado para a área de transferência!');
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm p-4 z-[100] flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 z-10 w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Infographic Art Card */}
        <div className="w-full aspect-[9/16] max-h-[70vh] bg-slate-950 border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col items-center justify-between overflow-hidden relative">
          {/* Glow effects */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-accent/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-48 h-48 bg-accent/10 rounded-full blur-[80px]" />

          {/* TOP: Logo & Title */}
          <div className="flex flex-col items-center gap-2 relative z-10 pt-2">
            <span className="text-2xl font-extrabold text-white tracking-tight">SYNTON</span>
            <span className="text-xs font-semibold text-white/50 uppercase tracking-[0.2em]">Sua Evolução</span>
          </div>

          {/* MIDDLE: Streak Counter */}
          <div className="flex flex-col items-center gap-3 relative z-10 flex-1 justify-center">
            <div className="w-20 h-20 rounded-full bg-accent/20 border-2 border-accent/40 flex items-center justify-center shadow-[0_0_40px_rgba(var(--accent-rgb,234,88,12),0.3)]">
              <Flame className="w-10 h-10 text-accent" />
            </div>
            <div className="text-center">
              <p className="text-5xl font-extrabold text-white leading-none">
                {streak}
              </p>
              <p className="text-lg font-bold text-accent mt-1 uppercase tracking-wider">
                {streak === 1 ? 'Semana' : 'Semanas'} de Ofensiva
              </p>
            </div>
          </div>

          {/* INFO GRID: Stats */}
          <div className="grid grid-cols-2 gap-3 w-full relative z-10">
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
              <p className="text-2xl font-extrabold text-accent">{presenceRate}%</p>
              <p className="text-[10px] text-white/50 uppercase tracking-wider font-semibold mt-0.5">Presença</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
              <p className="text-2xl font-extrabold text-accent">{stats?.present ?? 0}</p>
              <p className="text-[10px] text-white/50 uppercase tracking-wider font-semibold mt-0.5">Treinos</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
              <p className="text-2xl font-extrabold text-accent">{longestStreak}</p>
              <p className="text-[10px] text-white/50 uppercase tracking-wider font-semibold mt-0.5">Recorde</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
              <p className="text-2xl font-extrabold text-accent">{stats?.total ?? 0}</p>
              <p className="text-[10px] text-white/50 uppercase tracking-wider font-semibold mt-0.5">Aulas Totais</p>
            </div>
          </div>

          {/* BOTTOM: Student branding */}
          <div className="flex items-center gap-2 mt-4 relative z-10 pb-1">
            <div className="w-8 h-8 rounded-full bg-accent/30 border border-accent/50 flex items-center justify-center text-xs font-bold text-white">
              {firstName.charAt(0)}
            </div>
            <div>
              <p className="text-xs font-semibold text-white/80">{fullName}</p>
              <p className="text-[10px] text-white/40">Personal S.</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <button
          onClick={handleShare}
          className="mt-5 bg-accent hover:bg-accent/90 text-accent-foreground w-full py-4 rounded-xl font-bold text-lg shadow-md flex justify-center items-center gap-2 transition-colors"
        >
          <Share2 className="w-5 h-5" />
          Confirmar Compartilhamento
        </button>
        <button
          onClick={onClose}
          className="text-muted-foreground font-semibold text-sm cursor-pointer mt-4 hover:text-foreground transition-colors"
        >
          Não, cancelar
        </button>
      </div>
    </div>
  );
}
