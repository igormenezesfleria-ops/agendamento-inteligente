import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { TIME_SLOTS } from '@/lib/constants';
import { Loader2, Calendar, Clock, User, CheckCircle2 } from 'lucide-react';

interface CollaboratorHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collaboratorId: string | null;
  collaboratorName: string | null;
}

export function CollaboratorHistoryDialog({
  open,
  onOpenChange,
  collaboratorId,
  collaboratorName,
}: CollaboratorHistoryDialogProps) {
  const { data: history, isLoading } = useQuery({
    queryKey: ['collaboratorHistory', collaboratorId],
    queryFn: async () => {
      if (!collaboratorId) return [];

      const { data: appointments, error: appError } = await supabase
        .from('appointments')
        .select('id, date, time_slot, student_id, completed_at')
        .eq('instructor_id', collaboratorId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      if (appError) throw appError;
      if (!appointments || appointments.length === 0) return [];

      const studentIds = [...new Set(appointments.map((a) => a.student_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', studentIds);

      const profileMap = new Map(
        (profiles || []).map((p) => [p.id, p.name || 'Aluno'])
      );

      return appointments.map((a) => ({
        ...a,
        studentName: profileMap.get(a.student_id) || 'Aluno',
      }));
    },
    enabled: !!collaboratorId && open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico de {collaboratorName || 'Colaborador'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
            </div>
          ) : !history || history.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">Nenhum treino concluído ainda.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">{history.length} treino(s) concluído(s)</p>
              {history.map((item) => {
                const slot = TIME_SLOTS.find((s) => s.id === item.time_slot);
                const parsedDate = parseISO(item.date + 'T12:00:00');
                const formattedDate = format(parsedDate, "d 'de' MMMM", { locale: ptBR });

                return (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-3.5 h-3.5 text-accent" />
                        <span className="font-medium text-foreground">{item.studentName}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formattedDate}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{slot?.label || item.time_slot}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="completed" className="text-xs">Concluído</Badge>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
