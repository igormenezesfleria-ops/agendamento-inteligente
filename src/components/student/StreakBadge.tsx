import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Flame, Share2 } from 'lucide-react';
import { EvolutionHub } from './EvolutionHub';

export function StreakBadge() {
  const { profile } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  const streak = (profile as any)?.current_streak ?? 0;
  const hasStreak = streak > 0;

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
          <Flame className="w-5 h-5 text-orange-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground leading-tight">
            {hasStreak
              ? `${streak} semana${streak > 1 ? 's' : ''} de ofensiva`
              : 'Comece sua ofensiva!'}
          </p>
          <p className="text-xs text-muted-foreground leading-tight">
            {hasStreak ? 'Continue treinando para manter 🔥' : 'Treine essa semana para iniciar'}
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          aria-label="Compartilhar ofensiva"
          className="shrink-0 w-9 h-9 rounded-full bg-slate-50 hover:bg-orange-50 text-orange-500 flex items-center justify-center transition-colors"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>
      <EvolutionHub open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
