import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ROLE_LABELS } from '@/lib/constants';
import { toast } from 'sonner';
import { Loader2, User, Save, Trash2, Copy, Check } from 'lucide-react';
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

const profileSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100, 'Nome muito longo'),
  cpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/, 'CPF inválido').optional().or(z.literal('')),
  date_of_birth: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function Profile() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: profile?.name || '',
      cpf: profile?.cpf || '',
      date_of_birth: profile?.date_of_birth || '',
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('profiles')
        .update({
          name: data.name,
          cpf: data.cpf || null,
          date_of_birth: data.date_of_birth || null,
        })
        .eq('id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Perfil atualizado com sucesso!');
      refreshProfile();
    },
    onError: () => {
      toast.error('Erro ao atualizar perfil. Tente novamente.');
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true);
    await updateMutation.mutateAsync(data);
    setIsLoading(false);
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const response = await supabase.functions.invoke('delete-user', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) throw response.error;

      toast.success('Conta excluída com sucesso.');
      await signOut();
      navigate('/', { replace: true });
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir conta. Tente novamente.');
    } finally {
      setIsDeleting(false);
    }
  };

  const copyStudioCode = () => {
    if (profile?.studio_code) {
      navigator.clipboard.writeText(profile.studio_code);
      setCopied(true);
      toast.success('Código copiado!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatCPF = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in max-w-2xl">
        <div className="space-y-2">
          <h1 className="font-display text-3xl text-foreground">Meu Perfil</h1>
          <p className="text-muted-foreground">Atualize suas informações pessoais.</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center">
                <User className="w-8 h-8 text-accent" />
              </div>
              <div>
                <CardTitle>{profile?.name || 'Usuário'}</CardTitle>
                <Badge variant={profile?.role as any} className="mt-1">
                  {ROLE_LABELS[profile?.role || 'student']}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Studio Code for admins */}
              {profile?.role === 'admin' && profile.studio_code && (
                <div className="space-y-2">
                  <Label>Código do Studio</Label>
                  <div className="flex items-center gap-2 bg-accent/10 border border-accent/30 rounded-lg p-3">
                    <span className="font-mono text-lg font-bold text-accent tracking-widest flex-1">
                      {profile.studio_code}
                    </span>
                    <Button type="button" variant="ghost" size="sm" onClick={copyStudioCode}>
                      {copied ? <Check className="w-4 h-4 text-accent" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Compartilhe este código com seus alunos.</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input id="name" placeholder="Seu nome" {...register('name')} />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  placeholder="000.000.000-00"
                  {...register('cpf')}
                  onChange={(e) => { e.target.value = formatCPF(e.target.value); }}
                  maxLength={14}
                />
                {errors.cpf && <p className="text-sm text-destructive">{errors.cpf.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Data de Nascimento</Label>
                <Input id="date_of_birth" type="date" {...register('date_of_birth')} />
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email || ''} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">O email não pode ser alterado.</p>
              </div>

              <Button type="submit" variant="accent" disabled={isLoading}>
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
                ) : (
                  <><Save className="w-4 h-4" /> Salvar Alterações</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Delete Account */}
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-destructive text-lg">Zona de Perigo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Ao excluir sua conta, todos os seus dados serão removidos permanentemente. Esta ação não pode ser desfeita.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="w-4 h-4 mr-2" /> Deletar Minha Conta
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação é irreversível. Todos os seus dados, agendamentos e configurações serão excluídos permanentemente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Excluindo...</>
                    ) : (
                      'Sim, excluir minha conta'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
