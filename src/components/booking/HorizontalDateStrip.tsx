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

  // Auto-scroll to selected date
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
      className="flex flex-row overflow-x-auto gap-2 py-2 px-1 scrollbar-hide"
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
              'flex flex-col items-center justify-center min-w-[3.2rem] py-2.5 px-2 rounded-2xl border-2 transition-all duration-200 shrink-0',
              isSelected
                ? 'bg-accent border-accent text-accent-foreground scale-105 shadow-md'
                : 'bg-card border-border text-muted-foreground hover:border-accent/40',
              isToday && !isSelected && 'border-accent/30'
            )}
          >
            <span className="text-[10px] font-bold uppercase leading-none">
              {format(date, 'EEE', { locale: ptBR }).replace('.', '')}
            </span>
            <span className={cn(
              'text-lg font-bold leading-tight mt-0.5',
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
