import { format, addDays, isWeekend, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { BOOKING_WINDOW_DAYS } from '@/lib/constants';

interface DateSelectorProps {
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
}

export function DateSelector({ selectedDate, onSelectDate }: DateSelectorProps) {
  const today = startOfDay(new Date());
  
  // Generate available dates (next 31 days, excluding weekends)
  const availableDates: Date[] = [];
  let currentDate = today;
  
  while (availableDates.length < BOOKING_WINDOW_DAYS) {
    if (!isWeekend(currentDate)) {
      availableDates.push(currentDate);
    }
    currentDate = addDays(currentDate, 1);
  }

  return (
    <div className="space-y-4">
      <h3 className="font-display text-lg text-foreground">Selecione uma Data</h3>
      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-2">
        {availableDates.map((date) => {
          const isSelected = selectedDate && 
            format(selectedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
          const isToday = format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');

          return (
            <button
              key={date.toISOString()}
              onClick={() => onSelectDate(date)}
              className={cn(
                'flex flex-col items-center p-3 rounded-xl border-2 transition-all duration-200',
                isSelected
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border hover:border-accent/50 hover:bg-accent/5',
                isToday && !isSelected && 'border-primary/30'
              )}
            >
              <span className="text-xs text-muted-foreground uppercase">
                {format(date, 'EEE', { locale: ptBR })}
              </span>
              <span className="text-xl font-bold">
                {format(date, 'd')}
              </span>
              <span className="text-xs text-muted-foreground">
                {format(date, 'MMM', { locale: ptBR })}
              </span>
              {isToday && (
                <span className="text-[10px] text-accent font-medium mt-1">Hoje</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
