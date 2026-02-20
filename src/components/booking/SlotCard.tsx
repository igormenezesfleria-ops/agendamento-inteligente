import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, Loader2 } from 'lucide-react';
import { MAX_STUDENTS_PER_SLOT } from '@/lib/constants';

interface SlotCardProps {
  timeSlot: string;
  label: string;
  count: number;
  isLocked: boolean;
  isBooked: boolean;
  hasTimeConflict?: boolean;
  canBook: boolean;
  isLoading: boolean;
  onBook: () => void;
  maxCapacity?: number;
}

export function SlotCard({
  timeSlot,
  label,
  count,
  isLocked,
  isBooked,
  hasTimeConflict = false,
  canBook,
  isLoading,
  onBook,
  maxCapacity,
}: SlotCardProps) {
  const cap = maxCapacity ?? MAX_STUDENTS_PER_SLOT;
  const remaining = cap - count;
  const isFull = remaining <= 0;

  const getAvailabilityVariant = () => {
    if (isFull || isLocked) return 'full';
    if (remaining <= 1) return 'limited';
    return 'available';
  };

  const getAvailabilityText = () => {
    if (isLocked) return 'Bloqueado';
    if (isFull) return 'Lotado';
    if (remaining === 1) return '1 vaga';
    return `${remaining} vagas`;
  };

  const isDisabled = !canBook || isFull || isLocked || isBooked || hasTimeConflict || isLoading;

  const getButtonLabel = () => {
    if (isLoading) return null; // handled separately
    if (isBooked) return 'Já Agendado';
    if (hasTimeConflict) return 'Conflito de Horário';
    if (isLocked) return 'Horário Bloqueado';
    if (isFull) return 'Horário Lotado';
    if (!canBook) return 'Prazo Encerrado';
    return 'Solicitar Agendamento';
  };

  return (
    <div className="bg-card rounded-xl border p-4 card-hover">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-muted-foreground" />
          <span className="font-semibold text-foreground">{label}</span>
        </div>
        <Badge variant={getAvailabilityVariant()}>
          <Users className="w-3 h-3 mr-1" />
          {getAvailabilityText()}
        </Badge>
      </div>

      {isBooked || hasTimeConflict ? (
        <Button variant="secondary" className="w-full" disabled>
          {getButtonLabel()}
        </Button>
      ) : (
        <Button
          variant={isDisabled ? 'secondary' : 'accent'}
          className="w-full"
          disabled={isDisabled}
          onClick={onBook}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Agendando...
            </>
          ) : (
            getButtonLabel()
          )}
        </Button>
      )}
    </div>
  );
}
