import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Check, UserPlus, Loader2, AlertTriangle, Trash2, X } from 'lucide-react';
import { TIME_SLOTS } from '@/lib/constants';
import { isWithinDeadline, isSlotExpired } from '@/lib/deadline';

interface RequestCardProps {
  id: string;
  studentName: string;
  studentPhoto: string | null;
  date: string;
  timeSlot: string;
  status: string;
  isLoading: boolean;
  onConfirm: (id: string) => void;
  onDelegate: (id: string) => void;
  onDelete?: (id: string) => void;
  onReject?: (id: string) => void;
}

export function RequestCard({
  id, studentName, studentPhoto, date, timeSlot, status, isLoading, onConfirm, onDelegate, onDelete, onReject,
}: RequestCardProps) {
  const slot = TIME_SLOTS.find((s) => s.id === timeSlot);
  const parsedDate = parseISO(date + 'T12:00:00');
  const formattedDate = format(parsedDate, "EEE, d 'de' MMM", { locale: ptBR });

  const canAct = isWithinDeadline(date, timeSlot, 12);
  const isExpired = isSlotExpired(date, timeSlot);

  const initials = studentName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="bg-card rounded-2xl p-4 border border-border shadow-sm transition-all">
      <div className="flex items-start gap-3 mb-3">
        <Avatar className="h-10 w-10">
          {studentPhoto && <AvatarImage src={studentPhoto} alt={studentName} />}
          <AvatarFallback className="bg-accent/10 text-accent text-sm font-semibold">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <span className="font-bold text-foreground text-sm">{studentName}</span>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span className="capitalize">{formattedDate}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{slot?.label || timeSlot}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {isExpired ? (
          <>
            <Badge variant="destructive" className="flex items-center gap-1 text-[10px]">
              <AlertTriangle className="w-3 h-3" />Expirado
            </Badge>
            {onDelete && (
              <Button variant="destructive" size="sm" className="rounded-xl text-xs" onClick={() => onDelete(id)} disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </Button>
            )}
          </>
        ) : canAct ? (
          <>
            <Button variant="success" size="sm" className="rounded-xl text-xs" onClick={() => onConfirm(id)} disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-3.5 h-3.5 mr-1" />Confirmar</>}
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl text-xs" onClick={() => onDelegate(id)} disabled={isLoading}>
              <UserPlus className="w-3.5 h-3.5 mr-1" />Delegar
            </Button>
            {onReject && (
              <Button variant="outline" size="sm" className="rounded-xl text-xs text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => onReject(id)} disabled={isLoading}>
                <X className="w-3.5 h-3.5 mr-1" />Recusar
              </Button>
            )}
          </>
        ) : (
          <>
            <Badge variant="destructive" className="flex items-center gap-1 text-[10px]">
              <AlertTriangle className="w-3 h-3" />Prazo expirado
            </Badge>
            {onDelete && (
              <Button variant="destructive" size="sm" className="rounded-xl text-xs" onClick={() => onDelete(id)} disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-3.5 h-3.5 mr-1" />Descartar</>}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
