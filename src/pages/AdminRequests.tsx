import { useState } from 'react';
import { isWithinDeadline } from '@/lib/deadline';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { RequestCard } from '@/components/admin/RequestCard';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Loader2, Inbox } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

export default function AdminRequests() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [delegateDialogOpen, setDelegateDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<string | null>(null);
  const [selectedCollaborator, setSelectedCollaborator] = useState<string | null>(null);

  // Fetch pending requests
  const { data: requests, isLoading } = useQuery({
    queryKey: ['pendingRequests'],
    queryFn: async () => {
      const { data: appointments, error: appError } = await supabase
        .from('appointments')
        .select('id, date, time_slot, status, student_id')
        .eq('status', 'pending')
        .order('date', { ascending: true })
        .order('time_slot', { ascending: true });

      if (appError) throw appError;
      if (!appointments || appointments.length === 0) return [];

      const studentIds = [...new Set(appointments.map((a) => a.student_id))];
      const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('id, name, photo_url')
        .in('id', studentIds);

      if (profError) throw profError;

      const profileMap = new Map(
        (profiles || []).map((p) => [p.id, p])
      );

      return appointments.map((a) => ({
        ...a,
        studentName: profileMap.get(a.student_id)?.name || 'Aluno',
        studentPhoto: profileMap.get(a.student_id)?.photo_url || null,
      }));
    },
  });

  // Fetch collaborators
  const { data: collaborators } = useQuery({
    queryKey: ['collaborators'],
    queryFn: async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('role', 'collaborator')
        .eq('business_owner_id', currentUser.id);

      if (error) throw error;
      return data || [];
    },
  });

  // Confirm mutation
  const confirmMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'confirmed',
          instructor_id: user?.id,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Agendamento confirmado! Você é o instrutor.');
      queryClient.invalidateQueries({ queryKey: ['pendingRequests'] });
      setLoadingId(null);
    },
    onError: () => {
      toast.error('Erro ao confirmar agendamento');
      setLoadingId(null);
    },
  });

  // Delegate mutation via RPC with double-booking check
  const delegateMutation = useMutation({
    mutationFn: async ({ id, instructorId }: { id: string; instructorId: string }) => {
      // Find the appointment being delegated
      const appointment = requests?.find(r => r.id === id);
      if (!appointment) throw new Error('Appointment not found');

      // Check if collaborator already has an active appointment at that date + time
      const { data: conflicts, error: conflictError } = await supabase
        .from('appointments')
        .select('id')
        .eq('instructor_id', instructorId)
        .eq('date', appointment.date)
        .eq('time_slot', appointment.time_slot)
        .in('status', ['confirmed', 'delegated']);

      if (conflictError) throw conflictError;
      if (conflicts && conflicts.length > 0) {
        throw new Error('COLLABORATOR_CONFLICT');
      }

      const { error } = await supabase.rpc('delegate_appointment', {
        appt_id: id,
        target_instructor_id: instructorId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Agendamento delegado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['pendingRequests'] });
      setDelegateDialogOpen(false);
      setSelectedAppointment(null);
      setSelectedCollaborator(null);
      setLoadingId(null);
    },
    onError: (error: any) => {
      if (error.message === 'COLLABORATOR_CONFLICT') {
        toast.error('Este colaborador já possui uma aula delegada neste horário.');
      } else {
        toast.error('Erro ao delegar agendamento');
      }
      setLoadingId(null);
    },
  });

  const handleConfirm = (id: string) => {
    const request = requests?.find((r) => r.id === id);
    if (request && !isWithinDeadline(request.date, request.time_slot, 12)) {
      toast.error('Prazo de 12h para confirmação expirado.');
      return;
    }
    setLoadingId(id);
    confirmMutation.mutate(id);
  };

  const handleDelegate = (id: string) => {
    setSelectedAppointment(id);
    setDelegateDialogOpen(true);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Solicitação expirada descartada com sucesso.');
      queryClient.invalidateQueries({ queryKey: ['pendingRequests'] });
      setLoadingId(null);
    },
    onError: () => {
      toast.error('Erro ao descartar solicitação');
      setLoadingId(null);
    },
  });

  const handleDelete = (id: string) => {
    setLoadingId(id);
    deleteMutation.mutate(id);
  };

  const handleDelegateSubmit = () => {
    if (!selectedAppointment || !selectedCollaborator) return;
    setLoadingId(selectedAppointment);
    delegateMutation.mutate({
      id: selectedAppointment,
      instructorId: selectedCollaborator,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="space-y-2">
          <h1 className="font-display text-3xl text-foreground">Solicitações de Agendamento</h1>
          <p className="text-muted-foreground">
            Aprove ou delegue as solicitações pendentes dos alunos.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : requests?.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-4">
            {requests?.map((request) => (
              <RequestCard
                key={request.id}
                id={request.id}
                studentName={request.studentName}
                studentPhoto={request.studentPhoto}
                date={request.date}
                timeSlot={request.time_slot}
                status={request.status}
                isLoading={loadingId === request.id}
                onConfirm={handleConfirm}
                onDelegate={handleDelegate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Delegate Dialog */}
        <Dialog open={delegateDialogOpen} onOpenChange={setDelegateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delegar para Colaborador</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {collaborators?.length === 0 ? (
                <p className="text-muted-foreground">
                  Nenhum colaborador cadastrado. Adicione colaboradores na seção Equipe.
                </p>
              ) : (
                <RadioGroup
                  value={selectedCollaborator || ''}
                  onValueChange={setSelectedCollaborator}
                >
                  {collaborators?.map((collab) => (
                    <div key={collab.id} className="flex items-center space-x-2">
                      <RadioGroupItem value={collab.id} id={collab.id} />
                      <Label htmlFor={collab.id}>{collab.name}</Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDelegateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  variant="accent"
                  onClick={handleDelegateSubmit}
                  disabled={!selectedCollaborator || loadingId !== null}
                >
                  {loadingId ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Delegar'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-4">
        <Inbox className="w-8 h-8 text-success" />
      </div>
      <h3 className="font-display text-lg text-foreground mb-2">
        Tudo em dia! 🎉
      </h3>
      <p className="text-muted-foreground">
        Não há solicitações pendentes no momento.
      </p>
    </div>
  );
}
