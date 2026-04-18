import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock, X, Loader2, User } from 'lucide-react';
import { STATUS_LABELS, TIME_SLOTS } from '@/lib/constants';

interface AppointmentCardProps {
  id: string;
  date: string;
  timeSlot: string;
  status: string;
  instructorName?: string | null;
  attendance?: string | null;
  canCancel: boolean;
  isCancelling: boolean;
  onCancel: (id: string) => void;
}

export function AppointmentCard({
  id,
  date,
  timeSlot,
  status,
  instructorName,
  attendance,
  canCancel,
  isCancelling,
  onCancel,
}: AppointmentCardProps) {
  const slot = TIME_SLOTS.find((s) => s.id === timeSlot);
  const dateObj = parseISO(date + 'T12:00:00');
  const formattedDate = format(dateObj, "EEEE, d 'de' MMMM", { locale: ptBR });

  const showInstructor = (status === 'confirmed' || status === 'completed') && instructorName;

  return (
    <Card className="card-hover">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span className="capitalize">{formattedDate}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{slot?.label || timeSlot}</span>
            </div>
            {showInstructor && (
              <div className="flex items-center gap-2 text-sm text-accent">
                <User className="w-4 h-4" />
                <span>Instrutor: {instructorName}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Badge variant={status as any}>
                {STATUS_LABELS[status] || status}
              </Badge>
              {attendance === 'present' && (
                <Badge variant="confirmed">Presente</Badge>
              )}
              {attendance === 'absent' && (
                <Badge variant="destructive">Faltou</Badge>
              )}
            </div>
          </div>

          {canCancel && (status === 'pending' || status === 'confirmed') && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 border border-border"
              onClick={() => onCancel(id)}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <X className="w-3.5 h-3.5 mr-1.5" />
                  Cancelar
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
