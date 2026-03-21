import { Clock, Users, Loader2, User, ChevronDown, Circle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface BookingSlotCardProps {
  timeSlot: string;
  startTime: string;
  endTime: string;
  className: string;
  effectiveRemaining: number;
  maxCapacity: number;
  isLocked: boolean;
  isBooked: boolean;
  isFixed?: boolean;
  hasTimeConflict?: boolean;
  canBook: boolean;
  isSelected: boolean;
  onSelect: () => void;
  classmateNames?: string[];
  waitlistEnabled?: boolean;
  isOnWaitlist?: boolean;
  waitlistPosition?: number | null;
  waitlistLoading?: boolean;
  onJoinWaitlist?: () => void;
}

export function BookingSlotCard({
  timeSlot,
  startTime,
  endTime,
  className: slotClassName,
  effectiveRemaining,
  maxCapacity,
  isLocked,
  isBooked,
  isFixed = false,
  hasTimeConflict = false,
  canBook,
  isSelected,
  onSelect,
  classmateNames = [],
  waitlistEnabled = false,
  isOnWaitlist = false,
  waitlistPosition = null,
  waitlistLoading = false,
  onJoinWaitlist,
}: BookingSlotCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isFull = effectiveRemaining <= 0;
  const forceDisabled = isFixed || isBooked || hasTimeConflict;
  const isDisabled = forceDisabled || !canBook || isLocked;
  const confirmedCount = classmateNames.length;

  const getStatusText = () => {
    if (isLocked) return 'Bloqueado';
    if (isFixed) return 'Horário Fixo';
    if (isBooked) return 'Já Agendado';
    if (hasTimeConflict) return 'Conflito';
    if (isFull) return 'Lotado';
    if (!canBook) return 'Prazo Esgotado';
    return 'Disponível';
  };

  const getStatusColor = () => {
    if (isLocked || isFixed || isBooked || hasTimeConflict || !canBook) return 'text-muted-foreground';
    if (isFull) return 'text-destructive';
    if (effectiveRemaining <= 1) return 'text-amber-500';
    return 'text-emerald-600';
  };

  const getAvailabilityBadge = () => {
    if (isLocked || isFull) return null;
    if (effectiveRemaining === 1) return '1 vaga';
    return `${effectiveRemaining} vagas`;
  };

  const canSelect = !isDisabled && !isFull;
  const showWaitlist = isFull && waitlistEnabled && onJoinWaitlist && canBook && !forceDisabled;

  return (
    <div
      className={cn(
        'bg-card rounded-2xl p-4 border shadow-sm mb-3 transition-all duration-200',
        isSelected && canSelect && 'border-accent bg-accent/5 shadow-md',
        !isSelected && !isDisabled && !isFull && 'border-border hover:border-accent/40 cursor-pointer',
        (isDisabled || isFull) && !showWaitlist && 'opacity-60 cursor-not-allowed',
        isOnWaitlist && 'border-accent/30 bg-accent/5'
      )}
      onClick={() => {
        if (canSelect) onSelect();
      }}
    >
      <div className="flex items-center justify-between">
        {/* Left: Time */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-accent" />
          </div>
          <div className="min-w-0">
            <p className="text-base font-semibold text-foreground">
              {startTime} - {endTime}
            </p>
            <p className="text-xs text-muted-foreground truncate">{slotClassName}</p>
          </div>
        </div>

        {/* Center: Status */}
        <div className="text-center px-3 shrink-0">
          <p className={cn('text-sm font-bold', getStatusColor())}>
            {getStatusText()}
          </p>
          {getAvailabilityBadge() && (
            <p className="text-xs text-accent font-semibold">
              {getAvailabilityBadge()}
            </p>
          )}
        </div>

        {/* Right: Radio indicator or waitlist */}
        <div className="shrink-0">
          {isOnWaitlist ? (
            <div className="text-center">
              <span className="text-xs font-bold text-accent">Na Fila</span>
              {waitlistPosition && (
                <p className="text-[10px] text-muted-foreground">{waitlistPosition}º</p>
              )}
            </div>
          ) : canSelect ? (
            isSelected ? (
              <CheckCircle2 className="w-6 h-6 text-accent" />
            ) : (
              <Circle className="w-6 h-6 text-muted-foreground/30" />
            )
          ) : showWaitlist ? (
            <Button
              variant="outline"
              size="sm"
              className="border-accent text-accent hover:bg-accent/10 text-xs px-3"
              disabled={waitlistLoading}
              onClick={(e) => { e.stopPropagation(); onJoinWaitlist!(); }}
            >
              {waitlistLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Fila'}
            </Button>
          ) : (
            <Circle className="w-6 h-6 text-muted-foreground/20" />
          )}
        </div>
      </div>

      {/* Classmates expandable */}
      {confirmedCount > 0 && (
        <>
          <button
            type="button"
            className="w-full flex items-center justify-between mt-3 pt-2 border-t border-border/30 text-xs text-muted-foreground"
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          >
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {confirmedCount} aluno{confirmedCount > 1 ? 's' : ''} confirmado{confirmedCount > 1 ? 's' : ''}
            </span>
            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', expanded && 'rotate-180')} />
          </button>
          <div className={cn(
            'overflow-hidden transition-all duration-200',
            expanded ? 'max-h-40 opacity-100 mt-2' : 'max-h-0 opacity-0'
          )}>
            <div className="flex flex-wrap gap-1.5">
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
          </div>
        </>
      )}
    </div>
  );
}
