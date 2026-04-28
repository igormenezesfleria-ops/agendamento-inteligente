import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Users, UserMinus, Loader2, Clock, History, Inbox, CalendarClock, Phone, AlertTriangle, Target, Activity, ClipboardList, Ruler, Cake, FileText, Dumbbell, Flame, UserPlus, Mail, KeyRound, Copy, CheckCircle2 } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RecurringScheduleDialog } from '@/components/admin/RecurringScheduleDialog';
import { StudentAssessmentsTab } from '@/components/admin/StudentAssessmentsTab';
import { StudentDevTools } from '@/components/admin/StudentDevTools';
import { StudentWorkoutsTab } from '@/components/admin/StudentWorkoutsTab';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { STATUS_LABELS } from '@/lib/constants';

interface Student {
  id: string;
  name: string | null;
  created_at: string;
  phone: string | null;
  emergency_contact: string | null;
  main_objective: string | null;
  has_injury: boolean;
  injury_details: string | null;
  is_active: boolean;
  profile_completed: boolean;
  height: string | null;
  birth_date: string | null;
  current_streak: number;
  longest_streak: number;
}

function calculateAge(birthDateStr: string | null): number | null {
  if (!birthDateStr) return null;
  const parts = birthDateStr.split('/');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts.map(Number);
  if (!day || !month || !year || year < 1900) return null;
  const birth = new Date(year, month - 1, day);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
}

function maskBirthDate(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export default function MyStudents() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [triageOpen, setTriageOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [recurringStudent, setRecurringStudent] = useState<Student | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', phone: '', birth_date: '' });
  const [createdCredentials, setCreatedCredentials] = useState<{ name: string; email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const inviteMutation = useMutation({
    mutationFn: async (payload: typeof inviteForm) => {
      const { data, error } = await supabase.functions.invoke('invite-student', {
        body: payload,
      });
      if (error) {
        // FunctionsHttpError exposes the raw Response in `context`.
        // Parse it to surface the real edge-function error message.
        let serverMessage: string | undefined;
        try {
          const ctx: any = (error as any).context;
          if (ctx && typeof ctx.json === 'function') {
            const body = await ctx.json();
            serverMessage = body?.error || body?.message;
          } else if (ctx && typeof ctx.text === 'function') {
            const txt = await ctx.text();
            try {
              const parsed = JSON.parse(txt);
              serverMessage = parsed?.error || parsed?.message;
            } catch {
              serverMessage = txt;
            }
          }
        } catch {
          // ignore parse errors and fall back to error.message
        }
        throw new Error(serverMessage || error.message || 'Erro ao cadastrar aluno');
      }
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data: any) => {
      setCreatedCredentials({
        name: inviteForm.name,
        email: data?.email || inviteForm.email,
        password: data?.tempPassword || '',
      });
      queryClient.invalidateQueries({ queryKey: ['my-students'] });
    },
    onError: (err: any) => {
      const raw = (err?.message || '').toLowerCase();
      const isDuplicate =
        raw.includes('já está em uso') ||
        raw.includes('ja esta em uso') ||
        raw.includes('already') ||
        raw.includes('exists') ||
        raw.includes('registered') ||
        raw.includes('vinculado');

      if (isDuplicate) {
        toast({
          title: 'E-mail já cadastrado',
          description: 'Este e-mail já está vinculado a outro aluno. Tente usar um e-mail diferente.',
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: 'Erro ao cadastrar aluno',
        description: err?.message || 'Tente novamente em instantes.',
        variant: 'destructive',
      });
    },
  });

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.name.trim() || !inviteForm.email.trim()) {
      toast({ title: 'Preencha nome e e-mail', variant: 'destructive' });
      return;
    }
    inviteMutation.mutate(inviteForm);
  };

  const { data: students, isLoading } = useQuery({
    queryKey: ['my-students', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, created_at, phone, emergency_contact, main_objective, has_injury, injury_details, is_active, profile_completed, height, birth_date')
        .eq('business_owner_id', user!.id)
        .eq('role', 'student')
        .order('name');
      if (error) throw error;
      return data as Student[];
    },
    enabled: !!user?.id,
  });

  const { data: studentHistory, isLoading: loadingHistory } = useQuery({
    queryKey: ['student-history', selectedStudent?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('id, date, time_slot, status, attendance, completed_at')
        .eq('student_id', selectedStudent!.id)
        .or('status.eq.completed,attendance.eq.present,attendance.eq.absent')
        .order('date', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedStudent?.id && historyOpen,
  });

  const unlinkMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const { error } = await supabase.rpc('unlink_student', {
        target_student_id: studentId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Aluno desvinculado', description: 'O aluno foi removido do seu studio.' });
      queryClient.invalidateQueries({ queryKey: ['my-students'] });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível desvincular o aluno.', variant: 'destructive' });
    },
  });

  const attendanceLabel = (a: string | null) => {
    if (a === 'present') return <Badge variant="confirmed">Presente</Badge>;
    if (a === 'absent') return <Badge variant="destructive">Faltou</Badge>;
    return null;
  };

  const objectiveLabels: Record<string, string> = {
    emagrecimento: 'Emagrecimento',
    hipertrofia: 'Hipertrofia',
    saude: 'Saúde / Condicionamento',
    reabilitacao: 'Reabilitação',
    alta_performance: 'Alta Performance',
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-display text-3xl text-foreground">Meus Alunos</h1>
            <p className="text-muted-foreground">Gerencie os alunos vinculados ao seu studio.</p>
          </div>
          <Button onClick={() => setInviteOpen(true)} className="shrink-0">
            <UserPlus className="w-4 h-4" />
            Novo Aluno
          </Button>
        </div>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{students?.length ?? 0}</p>
              <p className="text-sm text-muted-foreground">Alunos vinculados</p>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : !students || students.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-secondary mx-auto flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-display text-xl text-foreground mb-2">Nenhum aluno vinculado</h3>
              <p className="text-muted-foreground">Compartilhe seu código de studio para que alunos se vinculem.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {students.map((student) => (
              <Card key={student.id} className="card-hover">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                        <span className="text-lg font-bold text-secondary-foreground">
                          {student.name?.charAt(0).toUpperCase() || 'A'}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-foreground">{student.name || 'Sem nome'}</h3>
                          {student.has_injury && (
                            <AlertTriangle className="w-4 h-4 text-destructive" />
                          )}
                        </div>
                        <Badge variant="student" className="mt-1">Aluno</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 bg-muted hover:bg-muted/80 border-border"
                      onClick={() => { setSelectedStudent(student); setTriageOpen(true); }}
                    >
                      <ClipboardList className="w-4 h-4 mr-1" />
                      Ficha
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 bg-muted hover:bg-muted/80 border-border"
                      onClick={() => { setSelectedStudent(student); setHistoryOpen(true); }}
                    >
                      <History className="w-4 h-4 mr-1" />
                      Histórico
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 bg-muted hover:bg-muted/80 border-border"
                      onClick={() => setRecurringStudent(student)}
                    >
                      <CalendarClock className="w-4 h-4 mr-1" />
                      Aluno Fixo
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                          <UserMinus className="w-4 h-4 mr-1" />
                          Desvincular
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Desvincular aluno?</AlertDialogTitle>
                          <AlertDialogDescription>
                            <strong>{student.name}</strong> perderá acesso à sua agenda imediatamente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => unlinkMutation.mutate(student.id)}
                          >
                            Desvincular
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Student Triage Dialog */}
        <Dialog open={triageOpen} onOpenChange={setTriageOpen}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Dossiê - {selectedStudent?.name}</DialogTitle>
            </DialogHeader>
            {selectedStudent && !selectedStudent.profile_completed ? (
              <div className="text-center py-8">
                <ClipboardList className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">O aluno ainda não preencheu a ficha de triagem.</p>
              </div>
            ) : selectedStudent ? (
              <>
              <Tabs defaultValue="ficha" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="ficha">
                    <ClipboardList className="w-3.5 h-3.5 mr-1.5" /> Ficha
                  </TabsTrigger>
                  <TabsTrigger value="treinos">
                    <Dumbbell className="w-3.5 h-3.5 mr-1.5" /> Treinos
                  </TabsTrigger>
                  <TabsTrigger value="avaliacoes">
                    <FileText className="w-3.5 h-3.5 mr-1.5" /> Avaliações
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="ficha" className="space-y-4 mt-4">
                  {/* Injury Alert */}
                  {selectedStudent.has_injury && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>⚠️ Lesão / Limitação</AlertTitle>
                      <AlertDescription className="font-medium">
                        {selectedStudent.injury_details || 'Não especificada'}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Age & Height highlight */}
                  {(selectedStudent.birth_date || selectedStudent.height) && (
                    <div className="flex gap-3">
                      {selectedStudent.birth_date && (() => {
                        const age = calculateAge(selectedStudent.birth_date);
                        return age !== null ? (
                          <div className="flex-1 flex items-center gap-2 p-3 rounded-lg bg-accent/10 border border-accent/20">
                            <Cake className="w-4 h-4 text-accent shrink-0" />
                            <div>
                              <p className="text-xs text-muted-foreground">Idade</p>
                              <p className="text-lg font-bold text-accent">{age} anos</p>
                            </div>
                          </div>
                        ) : null;
                      })()}
                      {selectedStudent.height && (
                        <div className="flex-1 flex items-center gap-2 p-3 rounded-lg bg-accent/10 border border-accent/20">
                          <Ruler className="w-4 h-4 text-accent shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground">Altura</p>
                            <p className="text-lg font-bold text-accent">{selectedStudent.height}m</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Streak badge */}
                  <div className="flex gap-3">
                    <div className="flex-1 flex items-center gap-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                      <Flame className="w-4 h-4 text-orange-500 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Ofensiva Atual</p>
                        <p className="text-lg font-bold text-orange-500">{selectedStudent.current_streak} sem.</p>
                      </div>
                    </div>
                    <div className="flex-1 flex items-center gap-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                      <Flame className="w-4 h-4 text-orange-400 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Recorde</p>
                        <p className="text-lg font-bold text-orange-400">{selectedStudent.longest_streak} sem.</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Telefone / WhatsApp</p>
                        <p className="text-sm font-medium text-foreground">{selectedStudent.phone || '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Contato de Emergência</p>
                        <p className="text-sm font-medium text-foreground">{selectedStudent.emergency_contact || '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <Target className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Objetivo Principal</p>
                        <p className="text-sm font-medium text-foreground">
                          {selectedStudent.main_objective ? objectiveLabels[selectedStudent.main_objective] || selectedStudent.main_objective : '—'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <Activity className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Pratica atividade física?</p>
                        <p className="text-sm font-medium text-foreground">{selectedStudent.is_active ? 'Sim' : 'Não'}</p>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="treinos" className="mt-4">
                  <StudentWorkoutsTab studentId={selectedStudent.id} studentName={selectedStudent.name} />
                </TabsContent>

                <TabsContent value="avaliacoes" className="mt-4">
                  <StudentAssessmentsTab
                    studentId={selectedStudent.id}
                    studentName={selectedStudent.name}
                    age={calculateAge(selectedStudent.birth_date)}
                    hasInjury={selectedStudent.has_injury}
                    injuryDetails={selectedStudent.injury_details}
                  />
                </TabsContent>
              </Tabs>
              <StudentDevTools studentId={selectedStudent.id} studentName={selectedStudent.name} />
              </>
            ) : null}
          </DialogContent>
        </Dialog>

        {/* Student History Dialog */}
        <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Histórico - {selectedStudent?.name}</DialogTitle>
            </DialogHeader>
            {loadingHistory ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
              </div>
            ) : !studentHistory || studentHistory.length === 0 ? (
              <div className="text-center py-8">
                <Inbox className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">Nenhum agendamento encontrado.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {studentHistory.map((appt) => (
                  <Card key={appt.id}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium text-foreground capitalize">
                            {format(parseISO(appt.date), "d MMM yyyy", { locale: ptBR })}
                          </p>
                          <p className="text-xs text-muted-foreground">{appt.time_slot}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {appt.attendance === 'present' || appt.attendance === 'absent'
                          ? attendanceLabel(appt.attendance)
                          : <Badge variant={appt.status === 'completed' ? 'completed' : 'outline'}>
                              {STATUS_LABELS[appt.status] || appt.status}
                            </Badge>
                        }
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
        {/* Recurring Schedule Dialog */}
        {recurringStudent && (
          <RecurringScheduleDialog
            open={!!recurringStudent}
            onOpenChange={(open) => { if (!open) setRecurringStudent(null); }}
            student={recurringStudent}
          />
        )}

        {/* Invite New Student Dialog */}
        <Dialog
          open={inviteOpen}
          onOpenChange={(open) => {
            setInviteOpen(open);
            if (!open) {
              setInviteForm({ name: '', email: '', phone: '', birth_date: '' });
              setCreatedCredentials(null);
              setCopied(false);
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {createdCredentials ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    Conta criada com sucesso
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5 text-accent" />
                    Cadastrar Novo Aluno
                  </>
                )}
              </DialogTitle>
            </DialogHeader>
            {createdCredentials ? (
              <div className="space-y-4 mt-2">
                <p className="text-sm text-muted-foreground">
                  Envie estes dados de acesso para <strong className="text-foreground">{createdCredentials.name}</strong> via WhatsApp. O aluno poderá alterar a senha após o primeiro login.
                </p>
                <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">E-mail</p>
                    <p className="text-sm font-mono font-semibold text-foreground break-all">{createdCredentials.email}</p>
                  </div>
                  <div className="border-t border-border pt-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1">
                      <KeyRound className="w-3 h-3" /> Senha temporária
                    </p>
                    <p className="text-lg font-mono font-bold text-accent tracking-wider">{createdCredentials.password}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={async () => {
                    const text = `Olá ${createdCredentials.name}! Seu acesso ao app:\n\nE-mail: ${createdCredentials.email}\nSenha: ${createdCredentials.password}\n\nFaça login e altere sua senha no perfil.`;
                    try {
                      await navigator.clipboard.writeText(text);
                      setCopied(true);
                      toast({ title: 'Dados copiados!', description: 'Cole no WhatsApp do aluno.' });
                      setTimeout(() => setCopied(false), 2500);
                    } catch {
                      toast({ title: 'Não foi possível copiar', variant: 'destructive' });
                    }
                  }}
                >
                  {copied ? (
                    <><CheckCircle2 className="w-4 h-4" /> Copiado!</>
                  ) : (
                    <><Copy className="w-4 h-4" /> Copiar Dados</>
                  )}
                </Button>
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => {
                    setInviteOpen(false);
                    setInviteForm({ name: '', email: '', phone: '', birth_date: '' });
                    setCreatedCredentials(null);
                    setCopied(false);
                    queryClient.invalidateQueries({ queryKey: ['my-students'] });
                  }}
                >
                  Concluir
                </Button>
              </div>
            ) : (
            <form onSubmit={handleInviteSubmit} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label htmlFor="invite-name">Nome Completo</Label>
                <Input
                  id="invite-name"
                  placeholder="Nome do aluno"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invite-email">E-mail</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="aluno@email.com"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invite-phone">Telefone (WhatsApp)</Label>
                <Input
                  id="invite-phone"
                  placeholder="(11) 99999-9999"
                  value={inviteForm.phone}
                  onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invite-birth">Data de Nascimento</Label>
                <Input
                  id="invite-birth"
                  placeholder="DD/MM/AAAA"
                  inputMode="numeric"
                  maxLength={10}
                  value={inviteForm.birth_date}
                  onChange={(e) => setInviteForm({ ...inviteForm, birth_date: maskBirthDate(e.target.value) })}
                />
              </div>
              <div className="rounded-lg bg-muted/60 border border-border p-3 flex items-start gap-2">
                <KeyRound className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Uma senha temporária será gerada e exibida na próxima tela para você enviar ao aluno via WhatsApp.
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={inviteMutation.isPending}>
                {inviteMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Criando conta...</>
                ) : (
                  'Criar Conta e Gerar Senha'
                )}
              </Button>
            </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
