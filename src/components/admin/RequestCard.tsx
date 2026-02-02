import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock, User, Check, UserPlus, Loader2 } from 'lucide-react';
import { TIME_SLOTS } from '@/lib/constants';

interface RequestCardProps {
  id: string;
  studentName: string;
  date: string;
  timeSlot: string;
  status: string;
  isLoading: boolean;
  onConfirm: (id: string) => void;
  onDelegate: (id: string) => void;
}

export function RequestCard({
  id,
  studentName,
  date,
  timeSlot,
  status,
  isLoading,
  onConfirm,
  onDelegate,
}: RequestCardProps) {
  const slot = TIME_SLOTS.find((s) => s.id === timeSlot);
  const formattedDate = format(new Date(date), "EEEE, d 'de' MMMM", { locale: ptBR });

  return (
    <Card className="card-hover">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-accent" />
              <span className="font-semibold text-foreground">{studentName}</span>
            </div>
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

          <div className="flex items-center gap-2">
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
