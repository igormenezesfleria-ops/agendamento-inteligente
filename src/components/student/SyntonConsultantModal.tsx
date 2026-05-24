import { useEffect } from 'react';
import { X, Smartphone, CheckCircle2 } from 'lucide-react';

export type ExerciseType =
  | 'bicep'
  | 'tricep'
  | 'squat'
  | 'plank'
  | 'generic';

export function resolveExerciseType(
  movementPattern?: string,
  exerciseName?: string,
): ExerciseType {
  const mp = (movementPattern ?? '').toUpperCase();
  const en = (exerciseName ?? '').toLowerCase();
  if (mp === 'PLANK_ISOMETRIC' || mp === 'CORE_PLANK' || en.includes('prancha')) return 'plank';
  if (mp === 'ROSCA_DIRETA' || en.includes('rosca') || en.includes('bíceps') || en.includes('biceps')) return 'bicep';
  if (mp === 'TRICEPS_PUSHDOWN' || en.includes('tríceps') || en.includes('triceps')) return 'tricep';
  if (mp.includes('SQUAT') || mp === 'PISTOL_SQUAT' || en.includes('agachamento')) return 'squat';
  return 'generic';
}

const INSTRUCTIONS: Record<ExerciseType, { title: string; body: string }> = {
  bicep: {
    title: 'Posicionamento Lateral',
    body: 'Para uma análise perfeita, posicione o celular lateralmente (de perfil). Mantenha os cotovelos alinhados ao tronco.',
  },
  tricep: {
    title: 'Posicionamento Lateral',
    body: 'Para uma análise perfeita, posicione o celular lateralmente (de perfil). Mantenha os cotovelos alinhados ao tronco.',
  },
  squat: {
    title: 'Posicionamento Lateral',
    body: 'Para uma análise perfeita, posicione o celular lateralmente (de perfil). Mantenha os cotovelos alinhados ao tronco.',
  },
  plank: {
    title: 'Posicionamento no Chão',
    body: 'Posicione o celular lateralmente no chão para enquadrar seu corpo inteiro.',
  },
  generic: {
    title: 'Posicionamento Recomendado',
    body: 'Posicione o celular para enquadrar seu corpo inteiro durante o exercício.',
  },
};

interface SyntonConsultantModalProps {
  open: boolean;
  exerciseType: ExerciseType;
  exerciseName?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function SyntonConsultantModal({
  open,
  exerciseType,
  exerciseName,
  onConfirm,
  onClose,
}: SyntonConsultantModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const copy = INSTRUCTIONS[exerciseType];

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-orange-600">
              <Smartphone className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600">
                Consultor Synton
              </p>
              <h2 className="text-base font-bold text-slate-900">{copy.title}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {exerciseName && (
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {exerciseName}
          </p>
        )}

        <p className="mt-3 text-sm leading-relaxed text-slate-700">{copy.body}</p>

        <button
          onClick={onConfirm}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-orange-600"
        >
          <CheckCircle2 className="h-4 w-4" /> Estou Posicionado
        </button>
      </div>
    </div>
  );
}
