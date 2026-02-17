import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, User, Clock, Inbox, CheckCircle2, XCircle, FileText } from 'lucide-react';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export default function MySchedule() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<any>(null);
  const [privateNotes, setPrivateNotes] = useState('');

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['my-schedule', user?.id],
    queryFn: async () => {
      const { data: appts, error } = await supabase
        .from('appointments')
        .select('id, date, time_slot, status, student_id, attendance, private_notes')
        .eq('instructor_id', user!.id)
        .in('status', ['confirmed', 'delegated', 'completed'])
        .order('date')
        .order('time_slot');

      if (error) throw error;
      if (!appts || appts.length === 0) return [];

      const studentIds = [...new Set(appts.map((a) => a.student_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', studentIds);

      const map = new Map((profiles || []).map((p) => [p.id, p.name]));
      return appts.map((a) => ({ ...a, studentName: map.get(a.student_id) || 'Aluno' }));
    },
    enabled: !!user?.id,
  });

  const attendanceMutation = useMutation({
    mutationFn: async ({ id, attendance }: { id: string; attendance: string }) => {
      const updateData: any = { attendance };
      if (attendance === 'present') {
        updateData.status = 'completed';
        updateData.completed_at = new Date().toISOString();
      }
      const { error } = await supabase.from('appointments').update(updateData).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { attendance }) => {
      toast.success(attendance === 'present' ? 'Presença registrada!' : 'Falta registrada!');
      queryClient.invalidateQueries({ queryKey: ['my-schedule'] });
    },
    onError: () => toast.error('Erro ao registrar presença.'),
  });

  const notesMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase.from('appointments').update({ private_notes: notes }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Observação salva!');
      setNotesDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['my-schedule'] });
    },
    onError: () => toast.error('Erro ao salvar observação.'),
  });

  const openNotes = (appt: any) => {
    setSelectedAppt(appt);
    setPrivateNotes(appt.private_notes || '');
    setNotesDialogOpen(true);
  };

  const today = startOfDay(new Date());
  const title = profile?.role === 'admin' ? 'Minha Agenda' : 'Meus Treinos';

  const canMarkAttendance = (appt: any) => {
    const apptDate = parseISO(appt.date);
    return (isBefore(apptDate, today) || format(apptDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd'))
      && appt.attendance === 'pending' && appt.status !== 'completed';
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="space-y-2">
          <h1 className="font-display text-3xl text-foreground">{title}</h1>
          <p className="text-muted-foreground">Seus treinos confirmados com controle de presença.</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : !appointments || appointments.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
              <Inbox className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">Nenhum treino encontrado.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map((appt: any) => (
              <Card key={appt.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">{appt.studentName}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span className="capitalize">
                            {format(parseISO(appt.date), "EEEE, d MMM", { locale: ptBR })}
                          </span>
                          <span>• {appt.time_slot}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {appt.attendance === 'present' && (
                        <Badge variant="confirmed">Presente</Badge>
                      )}
                      {appt.attendance === 'absent' && (
                        <Badge variant="destructive">Faltou</Badge>
                      )}
                      {appt.status === 'completed' ? (
                        <Badge variant="outline">Concluído</Badge>
                      ) : (
                        <Badge variant={appt.status === 'confirmed' ? 'confirmed' : 'secondary'}>
                          {appt.status === 'confirmed' ? 'Confirmado' : 'Delegado'}
                        </Badge>
                      )}

                      {canMarkAttendance(appt) && (
                        <>
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => attendanceMutation.mutate({ id: appt.id, attendance: 'present' })}
                            disabled={attendanceMutation.isPending}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Presente
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => attendanceMutation.mutate({ id: appt.id, attendance: 'absent' })}
                            disabled={attendanceMutation.isPending}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Faltou
                          </Button>
                        </>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openNotes(appt)}
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        {appt.private_notes ? 'Ver Nota' : 'Nota'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Private Notes Dialog */}
        <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Observação Técnica</DialogTitle>
            </DialogHeader>
            <Textarea
              value={privateNotes}
              onChange={(e) => setPrivateNotes(e.target.value)}
              placeholder="Adicione observações sobre o treino (visível apenas para instrutores)..."
              rows={4}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setNotesDialogOpen(false)}>Cancelar</Button>
              <Button
                variant="accent"
                onClick={() => selectedAppt && notesMutation.mutate({ id: selectedAppt.id, notes: privateNotes })}
                disabled={notesMutation.isPending}
              >
                {notesMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
