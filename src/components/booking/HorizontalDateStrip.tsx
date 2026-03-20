import { useRef, useEffect } from 'react';
import { format, addDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { BOOKING_WINDOW_DAYS } from '@/lib/constants';

interface HorizontalDateStripProps {
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
}

export function HorizontalDateStrip({ selectedDate, onSelectDate }: HorizontalDateStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const today = startOfDay(new Date());

  const dates: Date[] = [];
  for (let i = 0; i < BOOKING_WINDOW_DAYS; i++) {
    dates.push(addDays(today, i));
  }

  useEffect(() => {
    if (!selectedDate || !scrollRef.current) return;
    const idx = dates.findIndex(d => format(d, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd'));
    if (idx >= 0) {
      const child = scrollRef.current.children[idx] as HTMLElement;
      child?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [selectedDate]);

  return (
    <div
      ref={scrollRef}
      className="flex flex-row overflow-x-auto gap-3 py-2 px-1 scrollbar-hide"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {dates.map((date) => {
        const isSelected = selectedDate && format(selectedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
        const isToday = format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');

        return (
          <button
            key={date.toISOString()}
            onClick={() => onSelectDate(date)}
            className={cn(
              'flex flex-col items-center justify-center w-16 h-20 rounded-2xl border transition-all duration-200 shrink-0',
              isSelected
                ? 'bg-accent border-accent text-accent-foreground shadow-md'
                : 'bg-card border-border text-muted-foreground hover:border-accent/40 cursor-pointer',
              isToday && !isSelected && 'border-accent/30'
            )}
          >
            <span className={cn(
              'text-[11px] font-bold uppercase leading-none',
              isSelected ? 'text-accent-foreground' : 'text-muted-foreground'
            )}>
              {format(date, 'EEE', { locale: ptBR }).replace('.', '')}
            </span>
            <span className={cn(
              'text-xl font-extrabold leading-tight mt-1',
              isSelected ? 'text-accent-foreground' : 'text-foreground'
            )}>
              {format(date, 'd')}
            </span>
            {isToday && (
              <span className={cn(
                'text-[8px] font-bold leading-none mt-0.5',
                isSelected ? 'text-accent-foreground' : 'text-accent'
              )}>
                HOJE
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
