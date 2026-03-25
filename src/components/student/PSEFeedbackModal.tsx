import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface PSEFeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (score: number) => void;
}

const getScoreColor = (score: number, isSelected: boolean) => {
  if (!isSelected) return 'bg-muted text-muted-foreground border-border';
  if (score <= 3) return 'bg-emerald-500 text-white border-emerald-500';
  if (score <= 7) return 'bg-amber-500 text-white border-amber-500';
  return 'bg-red-500 text-white border-red-500';
};

const getScoreLabel = (score: number) => {
  if (score <= 2) return 'Muito Leve';
  if (score <= 4) return 'Leve';
  if (score <= 6) return 'Moderado';
  if (score <= 8) return 'Intenso';
  return 'Máximo';
};

export function PSEFeedbackModal({ open, onOpenChange, onSubmit }: PSEFeedbackModalProps) {
  const [selected, setSelected] = useState<number | null>(null);

  const handleSubmit = () => {
    if (selected !== null) {
      onSubmit(selected);
      setSelected(null);
      onOpenChange(false);
    }
  };

  const handleSkip = () => {
    setSelected(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl p-6 border-0 shadow-2xl">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-foreground">Como foi o esforço hoje?</h2>
          <p className="text-sm text-muted-foreground mt-1">Percepção Subjetiva de Esforço (PSE)</p>
        </div>

        {/* Scale */}
        <div className="flex flex-wrap justify-center gap-2 mb-2">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((score) => (
            <button
              key={score}
              onClick={() => setSelected(score)}
              className={cn(
                'w-11 h-11 rounded-full border-2 font-bold text-sm transition-all',
                'hover:scale-110 active:scale-95',
                getScoreColor(score, selected === score),
                selected === score && 'ring-2 ring-offset-2 ring-offset-card'
              )}
            >
              {score}
            </button>
          ))}
        </div>

        {/* Label */}
        <div className="text-center h-6 mb-4">
          {selected !== null && (
            <span className="text-sm font-semibold text-foreground animate-fade-in">
              {selected} — {getScoreLabel(selected)}
            </span>
          )}
        </div>

        {/* Actions */}
        <button
          onClick={handleSubmit}
          disabled={selected === null}
          className={cn(
            'w-full py-3 rounded-xl font-bold transition-all',
            selected !== null
              ? 'bg-accent text-accent-foreground hover:bg-accent/90'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          )}
        >
          Enviar Feedback
        </button>
        <span
          onClick={handleSkip}
          className="block text-center mt-3 text-muted-foreground text-sm cursor-pointer hover:text-foreground transition-colors"
        >
          Pular avaliação
        </span>
      </DialogContent>
    </Dialog>
  );
}
