import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Check, UserPlus, Loader2, AlertTriangle, Trash2 } from 'lucide-react';
import { TIME_SLOTS } from '@/lib/constants';
import { isWithinDeadline } from '@/lib/deadline';
import { isPast, parseISO as parseISODate } from 'date-fns';

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
}

export function RequestCard({
  id,
  studentName,
  studentPhoto,
  date,
  timeSlot,
  status,
  isLoading,
  onConfirm,
  onDelegate,
  onDelete,
}: RequestCardProps) {
  const slot = TIME_SLOTS.find((s) => s.id === timeSlot);
  const parsedDate = parseISO(date + 'T12:00:00');
  const formattedDate = format(parsedDate, "EEEE, d 'de' MMMM", { locale: ptBR });

  const canAct = isWithinDeadline(date, timeSlot, 12);
  const appointmentDt = parseISODate(date + 'T' + timeSlot + ':00');
  const isExpired = isPast(appointmentDt);

  const initials = studentName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Card className="card-hover">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              {studentPhoto && <AvatarImage src={studentPhoto} alt={studentName} />}
              <AvatarFallback className="bg-accent/10 text-accent text-sm font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-1">
              <span className="font-semibold text-foreground">{studentName}</span>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span className="capitalize">{formattedDate}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{slot?.label || timeSlot}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isExpired ? (
              <>
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Expirado
                </Badge>
                {onDelete && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onDelete(id)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                )}
              </>
            ) : canAct ? (
              <>
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => onConfirm(id)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      Confirmar
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelegate(id)}
                  disabled={isLoading}
                >
                  <UserPlus className="w-4 h-4 mr-1" />
                  Delegar
                </Button>
              </>
            ) : (
              <>
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Prazo expirado
                </Badge>
                {onDelete && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onDelete(id)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-1" />
                        Descartar
                      </>
                    )}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
