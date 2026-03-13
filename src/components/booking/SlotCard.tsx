import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, Loader2, ChevronDown, User } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  waitlistEnabled?: boolean;
  isOnWaitlist?: boolean;
  waitlistPosition?: number | null;
  waitlistLoading?: boolean;
  onJoinWaitlist?: () => void;
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
  waitlistEnabled = false,
  isOnWaitlist = false,
  waitlistLoading = false,
  onJoinWaitlist,
}: SlotCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isFull = effectiveRemaining <= 0;

  const getAvailabilityVariant = () => {
    if (isFull || isLocked) return 'full' as const;
    if (effectiveRemaining <= 1) return 'limited' as const;
    return 'available' as const;
  };

  const getAvailabilityText = () => {
    if (isLocked) return 'Bloqueado';
    if (isFull) return 'Lotado';
    if (effectiveRemaining === 1) return '1 vaga';
    return `${effectiveRemaining} vagas`;
  };

  const forceDisabled = isFixed || isBooked || hasTimeConflict;
  const isDisabled = forceDisabled || !canBook || isFull || isLocked || isLoading;

  const getButtonLabel = () => {
    if (isLoading) return null;
    if (isFixed) return 'Horário Fixo';
    if (isBooked) return 'Já Agendado';
    if (hasTimeConflict) return 'Conflito de Horário';
    if (isLocked) return 'Horário Bloqueado';
    if (!canBook && !isFull) return 'Prazo Esgotado';
    if (isFull) return null; // handled separately
    return 'Solicitar Agendamento';
  };

  const confirmedCount = classmateNames.length;

  // Determine what to render for the full-slot case
  const renderFullSlotButton = () => {
    if (isOnWaitlist) {
      return (
        <Button variant="secondary" className="w-full opacity-70 cursor-not-allowed" disabled>
          Na Fila
        </Button>
      );
    }
    if (waitlistEnabled && onJoinWaitlist && canBook && !forceDisabled) {
      return (
        <Button
          variant="outline"
          className="w-full border-accent text-accent hover:bg-accent/10"
          disabled={waitlistLoading}
          onClick={(e) => { e.stopPropagation(); onJoinWaitlist(); }}
        >
          {waitlistLoading ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Entrando...</>
          ) : (
            'Entrar na Fila de Espera'
          )}
        </Button>
      );
    }
    return (
      <Button variant="secondary" className="w-full opacity-70 cursor-not-allowed" disabled>
        Esgotado
      </Button>
    );
  };

  return (
    <div className="bg-card rounded-xl border overflow-hidden card-hover">
      <button
        type="button"
        className="w-full p-4 text-left focus:outline-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <span className="font-semibold text-foreground">{label}</span>
          </div>
          <Badge variant={getAvailabilityVariant()}>
            <Users className="w-3 h-3 mr-1" />
            {getAvailabilityText()}
          </Badge>
        </div>

        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <span>
            {confirmedCount > 0
              ? `${confirmedCount} aluno${confirmedCount > 1 ? 's' : ''} confirmado${confirmedCount > 1 ? 's' : ''}`
              : 'Toque para ver detalhes'}
          </span>
          <ChevronDown
            className={cn(
              'w-4 h-4 transition-transform duration-200',
              expanded && 'rotate-180'
            )}
          />
        </div>
      </button>

      <div
        className={cn(
          'overflow-hidden transition-all duration-200 ease-in-out',
          expanded ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="px-4 pb-2 border-t border-border/50">
          <p className="text-xs font-medium text-muted-foreground pt-3 pb-2">
            Alunos confirmados nesta aula:
          </p>
          {confirmedCount > 0 ? (
            <div className="flex flex-wrap gap-1.5 pb-3">
              {classmateNames.map((name, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-accent/10 text-accent font-medium"
                >
                  <User className="w-3 h-3" />
                  {name.split(' ').slice(0, 2).join(' ')}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground/70 italic pb-3">
              Nenhum aluno confirmado ainda.
            </p>
          )}
        </div>
      </div>

      <div className="px-4 pb-4">
        {isFull && !forceDisabled ? (
          renderFullSlotButton()
        ) : forceDisabled ? (
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
            className={cn('w-full', isDisabled && 'opacity-70 cursor-not-allowed')}
            disabled={isDisabled}
            onClick={(e) => {
              e.stopPropagation();
              onBook();
            }}
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
    </div>
  );
}
