import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Loader2, Ticket, Percent, Hash } from 'lucide-react';

interface PromoCode {
  id: string;
  admin_id: string;
  code: string;
  discount_percentage: number;
  max_uses_per_student: number;
  is_active: boolean;
  created_at: string;
}

export function PromoCouponsTab() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [code, setCode] = useState('');
  const [discount, setDiscount] = useState('');
  const [maxUses, setMaxUses] = useState('1');

  const { data: promos = [], isLoading } = useQuery({
    queryKey: ['promo-codes', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('admin_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as PromoCode[];
    },
    enabled: !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const trimmedCode = code.trim().toUpperCase();
      const discountVal = parseFloat(discount);
      if (!trimmedCode || discountVal <= 0 || discountVal > 100) {
        throw new Error('Dados inválidos');
      }
      const { error } = await supabase.from('promo_codes').insert({
        admin_id: user!.id,
        code: trimmedCode,
        discount_percentage: discountVal,
        max_uses_per_student: parseInt(maxUses) || 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Cupom criado!');
      qc.invalidateQueries({ queryKey: ['promo-codes'] });
      setCode('');
      setDiscount('');
      setMaxUses('1');
      setShowForm(false);
    },
    onError: () => toast.error('Erro ao criar cupom.'),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('promo_codes')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['promo-codes'] });
    },
    onError: () => toast.error('Erro ao atualizar cupom.'),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!showForm ? (
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Novo Cupom
        </Button>
      ) : (
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
                <Ticket className="w-5 h-5 text-accent" />
              </div>
              <h3 className="font-bold text-foreground">Criar Cupom</h3>
            </div>

            <div>
              <Label>Código do Cupom</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Ex: PROMO10"
                className="uppercase font-mono"
                maxLength={20}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-muted-foreground" />
                  Desconto (%)
                </Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="Ex: 10"
                />
              </div>
              <div>
                <Label className="flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                  Limite por aluno
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  placeholder="1"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!code.trim() || !discount || createMutation.isPending}
              >
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Criar Cupom
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {promos.length === 0 && !showForm ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <Ticket className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhum cupom criado ainda.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {promos.map((p) => (
            <Card key={p.id} className={!p.is_active ? 'opacity-60' : ''}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <Ticket className="w-4 h-4 text-accent" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono font-bold text-foreground truncate">{p.code}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{p.discount_percentage}% off</span>
                      <span>·</span>
                      <span>Máx {p.max_uses_per_student}x/aluno</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant={p.is_active ? 'default' : 'outline'} className="text-xs">
                    {p.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                  <Switch
                    checked={p.is_active}
                    onCheckedChange={(v) => toggleMutation.mutate({ id: p.id, is_active: v })}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
