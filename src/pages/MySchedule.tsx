import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, User, Clock, Calendar, Inbox, CheckCircle2, XCircle, FileText } from 'lucide-react';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export default function MySchedule() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<any>(null);
  const [privateNotes, setPrivateNotes] = useState('');
  const [expandedAttendance, setExpandedAttendance] = useState<string | null>(null);

  const today = startOfDay(new Date());

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['my-schedule', user?.id],
    queryFn: async () => {
      const { data: appts, error } = await supabase
        .from('appointments')
        .select('id, date, time_slot, status, student_id, attendance, private_notes')
        .eq('instructor_id', user!.id)
        .in('status', ['confirmed', 'delegated'])
        .gte('date', format(today, 'yyyy-MM-dd'))
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

  const title = profile?.role === 'admin' ? 'Minhas Tarefas.' : 'Meus Treinos.';
  const subtitle = profile?.role === 'admin'
    ? 'Treinos pendentes de ação — marque presença para concluir.'
    : 'Seus treinos confirmados com controle de presença.';

  const canMarkAttendance = (appt: any) => {
    const apptDate = parseISO(appt.date);
    return (isBefore(apptDate, today) || format(apptDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd'))
      && appt.attendance === 'pending' && appt.status !== 'completed';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in pb-32">
        <div className="text-center space-y-1 pt-2">
          <h1 className="text-3xl font-extrabold text-foreground">{title}</h1>
          <p className="text-muted-foreground text-sm">{subtitle}</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : !appointments || appointments.length === 0 ? (
          <div className="bg-card rounded-2xl p-10 border border-border shadow-sm text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Inbox className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-extrabold text-foreground mb-2">Sua agenda de treinos.</h3>
            <p className="text-muted-foreground text-sm">Ainda não há treinos confirmados. Eles aparecerão aqui.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map((appt: any) => (
              <div key={appt.id} className="bg-card rounded-2xl p-4 border border-border shadow-sm transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold text-foreground text-sm">{appt.studentName}</p>
                      <div className="flex items-center gap-1.5">
                        {appt.attendance === 'present' && <Badge variant="confirmed" className="text-[10px]">Presente</Badge>}
                        {appt.attendance === 'absent' && <Badge variant="destructive" className="text-[10px]">Faltou</Badge>}
                        {appt.status === 'delegated' && <Badge variant="secondary" className="text-[10px]">Delegado</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span className="capitalize">{format(parseISO(appt.date), "EEE, d 'de' MMM", { locale: ptBR })}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{appt.time_slot}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {canMarkAttendance(appt) ? (
                        expandedAttendance === appt.id ? (
                          <>
                            <Button size="sm" variant="success" className="rounded-xl text-xs"
                              onClick={() => { attendanceMutation.mutate({ id: appt.id, attendance: 'present' }); setExpandedAttendance(null); }}
                              disabled={attendanceMutation.isPending}>
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />Presente
                            </Button>
                            <Button size="sm" variant="outline" className="rounded-xl text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                              onClick={() => { attendanceMutation.mutate({ id: appt.id, attendance: 'absent' }); setExpandedAttendance(null); }}
                              disabled={attendanceMutation.isPending}>
                              <XCircle className="w-3.5 h-3.5 mr-1" />Faltou
                            </Button>
                          </>
                        ) : (
                          <Button size="sm" variant="accent" className="rounded-xl text-xs font-semibold"
                            onClick={() => setExpandedAttendance(appt.id)}>
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />Dar Presença / Falta
                          </Button>
                        )
                      ) : (
                        !canMarkAttendance(appt) && appt.attendance !== 'present' && appt.attendance !== 'absent' && (
                          <Badge variant="outline" className="text-[10px]">Aguardando</Badge>
                        )
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-accent"
                        onClick={() => openNotes(appt)} title={appt.private_notes ? 'Ver observação' : 'Adicionar observação'}>
                        <FileText className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Observação Técnica</DialogTitle>
            </DialogHeader>
            <Textarea value={privateNotes} onChange={(e) => setPrivateNotes(e.target.value)}
              placeholder="Adicione observações sobre o treino (visível apenas para instrutores)..." rows={4}
              className="bg-muted border-border rounded-xl focus:ring-2 focus:ring-accent" />
            <DialogFooter>
              <Button variant="outline" onClick={() => setNotesDialogOpen(false)}>Cancelar</Button>
              <Button variant="accent" onClick={() => selectedAppt && notesMutation.mutate({ id: selectedAppt.id, notes: privateNotes })}
                disabled={notesMutation.isPending}>
                {notesMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
