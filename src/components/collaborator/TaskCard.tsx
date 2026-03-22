import { format, isToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TIME_SLOTS, STATUS_LABELS } from '@/lib/constants';
import { isWithinDeadline } from '@/lib/deadline';
import { Loader2, Calendar, Clock, User, Check, X, CheckCircle2, AlertTriangle, UserCheck, UserX } from 'lucide-react';

export interface TaskCardProps {
  task: {
    id: string;
    date: string;
    time_slot: string;
    status: string;
    attendance?: string | null;
    collaborator_status?: string | null;
    profiles?: { name: string | null } | null;
  };
  type: 'pending' | 'confirmed' | 'completed';
  isLoading: boolean;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onComplete: (id: string) => void;
  onMarkAttendance?: (id: string, status: 'present' | 'absent') => void;
  onAcceptDelegation?: (id: string) => void;
  onDeclineDelegation?: (id: string) => void;
}

export function TaskCard({ task, type, isLoading, onAccept, onReject, onComplete, onMarkAttendance, onAcceptDelegation, onDeclineDelegation }: TaskCardProps) {
  const slot = TIME_SLOTS.find((s) => s.id === task.time_slot);
  const parsedDate = parseISO(task.date + 'T12:00:00');
  const isTodayTask = isToday(parsedDate);
  const formattedDate = format(parsedDate, "EEE, d 'de' MMM", { locale: ptBR });
  const canAct = isWithinDeadline(task.date, task.time_slot, 12);

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
      {/* Top row: student + badges */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-accent" />
          </div>
          <div>
            <span className="text-sm font-bold text-slate-900">{task.profiles?.name || 'Aluno'}</span>
            {isTodayTask && (
              <Badge className="ml-2 bg-accent/10 text-accent border-accent/20 text-[10px] font-bold">Hoje</Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant={task.status as any} className="text-[10px]">
            {STATUS_LABELS[task.status] || task.status}
          </Badge>
          {task.collaborator_status === 'pending' && (
            <Badge className="bg-amber-50 text-amber-600 border-amber-200 text-[10px]">Aguardando</Badge>
          )}
          {task.attendance === 'present' && <Badge variant="confirmed" className="text-[10px]">Presente</Badge>}
          {task.attendance === 'absent' && <Badge variant="destructive" className="text-[10px]">Faltou</Badge>}
        </div>
      </div>

      {/* Date & Time row */}
      <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
        <div className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          <span className="capitalize">{formattedDate}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          <span>{slot?.label || task.time_slot}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Collaborator delegation accept/decline */}
        {task.collaborator_status === 'pending' && onAcceptDelegation && onDeclineDelegation && (
          <>
            <Button
              variant="success"
              size="sm"
              className="rounded-xl text-xs"
              onClick={() => onAcceptDelegation(task.id)}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-3.5 h-3.5 mr-1" />Aceitar</>}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => onDeclineDelegation(task.id)}
              disabled={isLoading}
            >
              <X className="w-3.5 h-3.5 mr-1" />Recusar
            </Button>
          </>
        )}

        {/* Legacy pending actions */}
        {type === 'pending' && task.collaborator_status !== 'pending' && (
          <>
            {canAct ? (
              <>
                <Button variant="success" size="sm" className="rounded-xl text-xs" onClick={() => onAccept(task.id)} disabled={isLoading}>
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-3.5 h-3.5 mr-1" />Aceitar</>}
                </Button>
                <Button variant="outline" size="sm" className="rounded-xl text-xs text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => onReject(task.id)} disabled={isLoading}>
                  <X className="w-3.5 h-3.5 mr-1" />Recusar
                </Button>
              </>
            ) : (
              <Badge variant="destructive" className="flex items-center gap-1 text-[10px]">
                <AlertTriangle className="w-3 h-3" />Prazo de 12h expirado
              </Badge>
            )}
          </>
        )}

        {type === 'confirmed' && isTodayTask && (
          <>
            {(!task.attendance || task.attendance === 'pending') && onMarkAttendance && (
              <>
                <Button variant="success" size="sm" className="rounded-xl text-xs" onClick={() => onMarkAttendance(task.id, 'present')} disabled={isLoading}>
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UserCheck className="w-3.5 h-3.5 mr-1" />Presente</>}
                </Button>
                <Button variant="outline" size="sm" className="rounded-xl text-xs text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => onMarkAttendance(task.id, 'absent')} disabled={isLoading}>
                  <UserX className="w-3.5 h-3.5 mr-1" />Falta
                </Button>
              </>
            )}
            <Button
              size="sm"
              className="rounded-xl text-xs bg-accent hover:bg-accent/90 text-accent-foreground"
              onClick={() => onComplete(task.id)}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-3.5 h-3.5 mr-1" />Finalizar</>}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
