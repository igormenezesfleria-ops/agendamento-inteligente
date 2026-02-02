import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock, X, Loader2 } from 'lucide-react';
import { STATUS_LABELS, TIME_SLOTS } from '@/lib/constants';

interface AppointmentCardProps {
  id: string;
  date: string;
  timeSlot: string;
  status: string;
  canCancel: boolean;
  isCancelling: boolean;
  onCancel: (id: string) => void;
}

export function AppointmentCard({
  id,
  date,
  timeSlot,
  status,
  canCancel,
  isCancelling,
  onCancel,
}: AppointmentCardProps) {
  const slot = TIME_SLOTS.find((s) => s.id === timeSlot);
  const formattedDate = format(new Date(date), "EEEE, d 'de' MMMM", { locale: ptBR });

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
            <Badge variant={status as any}>
              {STATUS_LABELS[status] || status}
            </Badge>
          </div>

          {canCancel && status === 'pending' && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => onCancel(id)}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <X className="w-4 h-4 mr-1" />
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
