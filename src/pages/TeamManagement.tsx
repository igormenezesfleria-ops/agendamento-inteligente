import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { UserPlus, Trash2, Users, Loader2, ChevronRight, DollarSign } from 'lucide-react';
import { CollaboratorHistoryDialog } from '@/components/admin/CollaboratorHistoryDialog';
import { CollaboratorRatesDialog } from '@/components/admin/CollaboratorRatesDialog';

interface Collaborator {
  id: string;
  name: string | null;
  created_at: string;
  pay_type: string | null;
  base_rate: number | null;
  no_show_rate: number | null;
  fixed_monthly_rate: number | null;
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
        .select('id, name, created_at, pay_type, base_rate, no_show_rate')
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

  const handleCollabClick = (collab: Collaborator) => {
    setSelectedCollab({ id: collab.id, name: collab.name });
    setHistoryDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-display text-3xl text-foreground">Gerenciar Equipe</h1>
            <p className="text-muted-foreground">Adicione ou remova colaboradores do seu studio.</p>
          </div>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="accent">
                <UserPlus className="w-4 h-4 mr-2" />
                Adicionar Colaborador
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Colaborador</DialogTitle>
                <DialogDescription>Crie uma conta para o novo membro da equipe.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome completo</Label>
                  <Input id="name" placeholder="Nome do colaborador" value={newCollaborator.name} onChange={(e) => setNewCollaborator({ ...newCollaborator, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" placeholder="email@exemplo.com" value={newCollaborator.email} onChange={(e) => setNewCollaborator({ ...newCollaborator, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha inicial</Label>
                  <Input id="password" type="password" placeholder="Mínimo 6 caracteres" value={newCollaborator.password} onChange={(e) => setNewCollaborator({ ...newCollaborator, password: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isSubmitting}>Cancelar</Button>
                <Button variant="accent" onClick={addCollaborator} disabled={isSubmitting}>
                  {isSubmitting ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Criando...</>) : 'Criar Colaborador'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{collaborators?.length ?? 0}</p>
              <p className="text-sm text-muted-foreground">Colaboradores ativos</p>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : collaborators && collaborators.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {collaborators.map((collaborator) => (
              <Card
                key={collaborator.id}
                className="card-hover cursor-pointer"
                onClick={() => handleCollabClick(collaborator)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                        <span className="text-lg font-bold text-secondary-foreground">
                          {collaborator.name?.charAt(0).toUpperCase() || 'C'}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">{collaborator.name || 'Sem nome'}</h3>
                        <Badge variant="collaborator" className="mt-1">Colaborador</Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-accent"
                        onClick={(e) => {
                          e.stopPropagation();
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
                            className="text-muted-foreground hover:text-destructive"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover colaborador?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. O colaborador{' '}
                              <strong>{collaborator.name}</strong> perderá acesso ao sistema.
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
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mt-4">
                    Adicionado em {new Date(collaborator.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-secondary mx-auto flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-display text-xl text-foreground mb-2">Nenhum colaborador</h3>
              <p className="text-muted-foreground mb-6">Adicione membros à sua equipe para delegar treinos.</p>
              <Button variant="accent" onClick={() => setIsAddDialogOpen(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Adicionar Primeiro Colaborador
              </Button>
            </CardContent>
          </Card>
        )}

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
