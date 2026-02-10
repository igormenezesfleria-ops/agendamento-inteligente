import { format, isToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { TIME_SLOTS, STATUS_LABELS } from '@/lib/constants';
import { isWithinDeadline } from '@/lib/deadline';
import { Loader2, Calendar, Clock, User, Check, X, CheckCircle2, AlertTriangle } from 'lucide-react';

export interface TaskCardProps {
  task: {
    id: string;
    date: string;
    time_slot: string;
    status: string;
    profiles?: { name: string | null } | null;
  };
  type: 'pending' | 'confirmed' | 'completed';
  isLoading: boolean;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onComplete: (id: string) => void;
}

export function TaskCard({ task, type, isLoading, onAccept, onReject, onComplete }: TaskCardProps) {
  const slot = TIME_SLOTS.find((s) => s.id === task.time_slot);
  const parsedDate = parseISO(task.date + 'T12:00:00');
  const isTodayTask = isToday(parsedDate);
  const formattedDate = format(parsedDate, "EEEE, d 'de' MMMM", { locale: ptBR });

  const canAct = isWithinDeadline(task.date, task.time_slot, 12);

  return (
    <Card className="card-hover">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-accent" />
              <span className="font-semibold text-foreground">{task.profiles?.name || 'Aluno'}</span>
              {isTodayTask && (
                <Badge variant="confirmed" className="text-xs">Hoje</Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span className="capitalize">{formattedDate}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{slot?.label || task.time_slot}</span>
              </div>
            </div>
            <Badge variant={task.status as any}>
              {STATUS_LABELS[task.status] || task.status}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {type === 'pending' && (
              <>
                {canAct ? (
                  <>
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => onAccept(task.id)}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-1" />
                          Aceitar
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => onReject(task.id)}
                      disabled={isLoading}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Recusar
                    </Button>
                  </>
                ) : (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Prazo de 12h expirado
                  </Badge>
                )}
              </>
            )}

            {type === 'confirmed' && isTodayTask && (
              <Button
                variant="accent"
                size="sm"
                onClick={() => onComplete(task.id)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Finalizar Treino
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
