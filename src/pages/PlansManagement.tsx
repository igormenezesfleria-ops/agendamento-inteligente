import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, Package, DollarSign } from 'lucide-react';

type PlanType = 'monthly' | 'yearly' | 'class_pack';

interface Plan {
  id: string;
  admin_id: string;
  name: string;
  description: string;
  price: number;
  plan_type: PlanType;
  credits_amount: number | null;
  classes_per_week: number | null;
  validity_months: number | null;
  accepts_pix: boolean;
  accepts_credit: boolean;
  is_active: boolean;
}

const PLAN_TYPE_LABELS: Record<PlanType, string> = {
  monthly: 'Mensal',
  yearly: 'Anual',
  class_pack: 'Pacote de Aulas',
};

const emptyForm = {
  name: '',
  description: '',
  price: '',
  plan_type: 'monthly' as PlanType,
  credits_amount: '',
  is_active: true,
};

export default function PlansManagement() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['membership-plans', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('membership_plans')
        .select('*')
        .eq('admin_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Plan[];
    },
    enabled: !!user?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        admin_id: user!.id,
        name: form.name.trim(),
        description: form.description.trim(),
        price: parseFloat(form.price) || 0,
        plan_type: form.plan_type as PlanType,
        credits_amount: form.plan_type === 'class_pack' ? (parseInt(form.credits_amount) || null) : null,
        is_active: form.is_active,
      };
      if (editingId) {
        const { error } = await supabase
          .from('membership_plans')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('membership_plans')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? 'Plano atualizado!' : 'Plano criado!');
      qc.invalidateQueries({ queryKey: ['membership-plans'] });
      closeDialog();
    },
    onError: () => toast.error('Erro ao salvar plano.'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('membership_plans').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Plano removido.');
      qc.invalidateQueries({ queryKey: ['membership-plans'] });
      setDeleteId(null);
    },
    onError: () => toast.error('Erro ao remover plano.'),
  });

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = (p: Plan) => {
    setForm({
      name: p.name,
      description: p.description || '',
      price: String(p.price),
      plan_type: p.plan_type,
      credits_amount: p.credits_amount ? String(p.credits_amount) : '',
      is_active: p.is_active,
    });
    setEditingId(p.id);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl text-foreground">Planos & Preços</h1>
            <p className="text-muted-foreground text-sm">Gerencie os planos oferecidos aos seus alunos.</p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" /> Novo Plano
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : plans.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-16 text-center">
              <Package className="w-12 h-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Nenhum plano cadastrado ainda.</p>
              <Button variant="outline" className="mt-4" onClick={openCreate}>
                Criar Primeiro Plano
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((p) => (
              <Card key={p.id} className={!p.is_active ? 'opacity-60' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg">{p.name}</CardTitle>
                    <Badge variant={p.is_active ? 'default' : 'outline'} className="shrink-0 text-xs">
                      {p.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {p.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>
                  )}
                  <div className="flex items-baseline gap-1">
                    <DollarSign className="w-4 h-4 text-accent" />
                    <span className="text-2xl font-bold text-foreground">
                      R$ {Number(p.price).toFixed(2)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      / {PLAN_TYPE_LABELS[p.plan_type]}
                    </span>
                  </div>
                  {p.plan_type === 'class_pack' && p.credits_amount && (
                    <Badge variant="secondary">{p.credits_amount} aulas</Badge>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => openEdit(p)}>
                      <Pencil className="w-3.5 h-3.5" /> Editar
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => setDeleteId(p.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar Plano' : 'Novo Plano'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Nome</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Mensal Premium" />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição do plano..." rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Preço (R$)</Label>
                  <Input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0.00" />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.plan_type} onValueChange={(v) => setForm({ ...form, plan_type: v as PlanType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="yearly">Anual</SelectItem>
                      <SelectItem value="class_pack">Pacote de Aulas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {form.plan_type === 'class_pack' && (
                <div>
                  <Label>Quantidade de Aulas</Label>
                  <Input type="number" min="1" value={form.credits_amount} onChange={(e) => setForm({ ...form, credits_amount: e.target.value })} placeholder="Ex: 10" />
                </div>
              )}
              <div className="flex items-center justify-between">
                <Label>Plano Ativo</Label>
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={!form.name.trim() || saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {editingId ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete confirm */}
        <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Remover Plano</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">Tem certeza que deseja remover este plano? Esta ação não pode ser desfeita.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
              <Button variant="destructive" onClick={() => deleteId && deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Remover
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
