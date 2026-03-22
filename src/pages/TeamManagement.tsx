import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Trash2, Users, Loader2, ChevronRight, DollarSign, Eye } from 'lucide-react';
import { CollaboratorHistoryDialog } from '@/components/admin/CollaboratorHistoryDialog';
import { CollaboratorRatesDialog } from '@/components/admin/CollaboratorRatesDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Collaborator {
  id: string;
  name: string | null;
  created_at: string;
  pay_type: string | null;
  base_rate: number | null;
  no_show_rate: number | null;
  fixed_monthly_rate: number | null;
  photo_url: string | null;
}

export default function TeamManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newCollaborator, setNewCollaborator] = useState({ email: '', password: '', name: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedCollab, setSelectedCollab] = useState<{ id: string; name: string | null } | null>(null);
  const [ratesDialogOpen, setRatesDialogOpen] = useState(false);
  const [ratesCollab, setRatesCollab] = useState<Collaborator | null>(null);

  const { data: collaborators, isLoading } = useQuery({
    queryKey: ['collaborators'],
    queryFn: async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, created_at, pay_type, base_rate, no_show_rate, fixed_monthly_rate, photo_url')
        .eq('role', 'collaborator')
        .eq('business_owner_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Collaborator[];
    },
  });

  const addCollaborator = async () => {
    if (!newCollaborator.email || !newCollaborator.password || !newCollaborator.name) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha todos os campos.', variant: 'destructive' });
      return;
    }
    if (newCollaborator.password.length < 6) {
      toast({ title: 'Senha muito curta', description: 'A senha deve ter pelo menos 6 caracteres.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('create-collaborator', {
        body: { email: newCollaborator.email, password: newCollaborator.password, name: newCollaborator.name },
      });
      if (error) throw error;
      toast({ title: 'Colaborador adicionado!', description: `${newCollaborator.name} foi adicionado à equipe.` });
      setNewCollaborator({ email: '', password: '', name: '' });
      setIsAddDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['collaborators'] });
    } catch (error: any) {
      toast({ title: 'Erro ao adicionar', description: error.message || 'Não foi possível adicionar o colaborador.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeCollaboratorMutation = useMutation({
    mutationFn: async (collaboratorId: string) => {
      const { error } = await supabase.functions.invoke('remove-collaborator', { body: { collaboratorId } });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Colaborador removido', description: 'O colaborador foi removido da equipe.' });
      queryClient.invalidateQueries({ queryKey: ['collaborators'] });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao remover', description: error.message || 'Não foi possível remover o colaborador.', variant: 'destructive' });
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in pb-32">
        {/* Premium Header */}
        <div className="text-center space-y-1 pt-2">
          <h1 className="text-3xl font-extrabold text-slate-900">Sua Equipe.</h1>
          <p className="text-slate-500 text-sm">Gerencie os colaboradores do seu studio.</p>
        </div>

        {/* Stats Card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Users className="w-6 h-6 text-accent" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-slate-900">{collaborators?.length ?? 0}</p>
            <p className="text-xs text-slate-500">Colaboradores ativos</p>
          </div>
        </div>

        {/* Collaborator List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : collaborators && collaborators.length > 0 ? (
          <div className="space-y-3">
            {collaborators.map((collaborator) => (
              <div
                key={collaborator.id}
                className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4 cursor-pointer hover:border-accent/30 transition-all"
                onClick={() => {
                  setSelectedCollab({ id: collaborator.id, name: collaborator.name });
                  setHistoryDialogOpen(true);
                }}
              >
                {/* Avatar */}
                <Avatar className="w-12 h-12">
                  <AvatarImage src={collaborator.photo_url || undefined} />
                  <AvatarFallback className="bg-accent/10 text-accent font-bold text-lg">
                    {collaborator.name?.charAt(0).toUpperCase() || 'C'}
                  </AvatarFallback>
                </Avatar>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 truncate">
                      {collaborator.name || 'Sem nome'}
                    </h3>
                    <Badge className="bg-accent/10 text-accent border-accent/20 text-[10px] font-bold uppercase tracking-wide">
                      Ativo
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {collaborator.pay_type === 'fixed_monthly' ? 'Salário Fixo' :
                     collaborator.pay_type === 'per_student' ? 'Por Aluno' :
                     collaborator.pay_type === 'per_class' ? 'Por Aula' : 'Treinador'}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-accent"
                    onClick={() => {
                      setSelectedCollab({ id: collaborator.id, name: collaborator.name });
                      setHistoryDialogOpen(true);
                    }}
                    title="Ver histórico"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-accent"
                    onClick={() => {
                      setRatesCollab(collaborator);
                      setRatesDialogOpen(true);
                    }}
                    title="Configurar pagamento"
                  >
                    <DollarSign className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover colaborador?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. <strong>{collaborator.name}</strong> perderá acesso ao sistema.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => removeCollaboratorMutation.mutate(collaborator.id)}
                        >
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-10 border border-slate-100 shadow-sm text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 mx-auto flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 mb-2">Nenhum colaborador</h3>
            <p className="text-slate-500 text-sm mb-6">Adicione membros à sua equipe para delegar treinos.</p>
          </div>
        )}

        {/* Primary CTA */}
        <button
          onClick={() => setIsAddDialogOpen(true)}
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground py-4 rounded-xl font-bold text-lg shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <UserPlus className="w-5 h-5" />
          Adicionar Colaborador
        </button>

        {/* Add Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Colaborador</DialogTitle>
              <DialogDescription>Crie uma conta para o novo membro da equipe.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  placeholder="Nome do colaborador"
                  value={newCollaborator.name}
                  onChange={(e) => setNewCollaborator({ ...newCollaborator, name: e.target.value })}
                  className="bg-slate-50 border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-accent focus:border-accent focus:bg-white transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={newCollaborator.email}
                  onChange={(e) => setNewCollaborator({ ...newCollaborator, email: e.target.value })}
                  className="bg-slate-50 border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-accent focus:border-accent focus:bg-white transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha inicial</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={newCollaborator.password}
                  onChange={(e) => setNewCollaborator({ ...newCollaborator, password: e.target.value })}
                  className="bg-slate-50 border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-accent focus:border-accent focus:bg-white transition-all"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isSubmitting}>Cancelar</Button>
              <Button
                onClick={addCollaborator}
                disabled={isSubmitting}
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                {isSubmitting ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Criando...</>) : 'Criar Colaborador'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <CollaboratorHistoryDialog
          open={historyDialogOpen}
          onOpenChange={setHistoryDialogOpen}
          collaboratorId={selectedCollab?.id || null}
          collaboratorName={selectedCollab?.name || null}
        />

        <CollaboratorRatesDialog
          open={ratesDialogOpen}
          onOpenChange={setRatesDialogOpen}
          collaborator={ratesCollab}
        />
      </div>
    </DashboardLayout>
  );
}
