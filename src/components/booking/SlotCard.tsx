import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, Loader2 } from 'lucide-react';

interface SlotCardProps {
  timeSlot: string;
  label: string;
  effectiveRemaining: number;
  maxCapacity: number;
  isLocked: boolean;
  isBooked: boolean;
  isFixed?: boolean;
  hasTimeConflict?: boolean;
  canBook: boolean;
  isLoading: boolean;
  onBook: () => void;
  actionWindowHours?: number;
  classmateNames?: string[];
}

export function SlotCard({
  timeSlot,
  label,
  effectiveRemaining,
  maxCapacity,
  isLocked,
  isBooked,
  isFixed = false,
  hasTimeConflict = false,
  canBook,
  isLoading,
  onBook,
  actionWindowHours = 2,
  classmateNames = [],
}: SlotCardProps) {
  const remaining = effectiveRemaining;
  const isFull = remaining <= 0;

  const getAvailabilityVariant = () => {
    if (isFull || isLocked) return 'full';
    if (remaining <= 1) return 'limited';
    return 'available';
  };

  const getAvailabilityText = () => {
    if (isLocked) return 'Bloqueado';
    if (isFull) return 'Esgotado';
    if (remaining === 1) return '1 vaga';
    return `${remaining} vagas`;
  };

  // Fixed or already booked → always disabled
  const forceDisabled = isFixed || isBooked || hasTimeConflict;
  const isDisabled = forceDisabled || !canBook || isFull || isLocked || isLoading;

  const getButtonLabel = () => {
    if (isLoading) return null;
    if (isFixed) return 'Horário Fixo';
    if (isBooked) return 'Já Agendado';
    if (hasTimeConflict) return 'Conflito de Horário';
    if (isLocked) return 'Horário Bloqueado';
    if (isFull) return 'Vagas Esgotadas';
    if (!canBook) return 'Prazo Esgotado';
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

      {classmateNames.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {classmateNames.map((name, i) => (
            <span
              key={i}
              className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium"
            >
              {name.split(' ').slice(0, 2).join(' ')}
            </span>
          ))}
        </div>
      )}

      {forceDisabled ? (
        <Button
          variant="secondary"
          className="w-full bg-muted text-muted-foreground cursor-not-allowed opacity-70"
          disabled
        >
          {getButtonLabel()}
        </Button>
      ) : (
        <Button
          variant={isDisabled ? 'secondary' : 'accent'}
          className={`w-full ${isDisabled ? 'opacity-70 cursor-not-allowed' : ''}`}
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
