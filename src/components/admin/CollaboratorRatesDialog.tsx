import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, DollarSign } from 'lucide-react';

interface CollaboratorRatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collaborator: {
    id: string;
    name: string | null;
    pay_type: string | null;
    base_rate: number | null;
    no_show_rate: number | null;
    fixed_monthly_rate?: number | null;
  } | null;
}

export function CollaboratorRatesDialog({ open, onOpenChange, collaborator }: CollaboratorRatesDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [payType, setPayType] = useState('per_class');
  const [baseRate, setBaseRate] = useState('');
  const [noShowRate, setNoShowRate] = useState('');
  const [fixedMonthlyRate, setFixedMonthlyRate] = useState('');

  useEffect(() => {
    if (collaborator) {
      setPayType(collaborator.pay_type || 'per_class');
      setBaseRate(String(collaborator.base_rate ?? 0));
      setNoShowRate(String(collaborator.no_show_rate ?? 0));
      setFixedMonthlyRate(String(collaborator.fixed_monthly_rate ?? 0));
    }
  }, [collaborator]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!collaborator) return;

      const updateData: Record<string, unknown> = { pay_type: payType };

      if (payType === 'per_class') {
        updateData.base_rate = parseFloat(baseRate) || 0;
        updateData.no_show_rate = 0;
        updateData.fixed_monthly_rate = 0;
      } else if (payType === 'per_student') {
        updateData.base_rate = parseFloat(baseRate) || 0;
        updateData.no_show_rate = parseFloat(noShowRate) || 0;
        updateData.fixed_monthly_rate = 0;
      } else if (payType === 'fixed_monthly') {
        updateData.base_rate = 0;
        updateData.no_show_rate = 0;
        updateData.fixed_monthly_rate = parseFloat(fixedMonthlyRate) || 0;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', collaborator.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Valores atualizados!', description: 'As taxas do colaborador foram salvas.' });
      queryClient.invalidateQueries({ queryKey: ['collaborators'] });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível salvar os valores.', variant: 'destructive' });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-accent" />
            Configurar Pagamento
          </DialogTitle>
          <DialogDescription>
            Defina as regras de pagamento para <strong>{collaborator?.name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Tipo de Pagamento</Label>
            <Select value={payType} onValueChange={setPayType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="per_class">Por Aula (valor fixo por aula dada)</SelectItem>
                <SelectItem value="per_student">Por Aluno (valor por presença/falta)</SelectItem>
                <SelectItem value="fixed_monthly">Salário Fixo Mensal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {payType === 'per_class' && (
            <div className="space-y-2">
              <Label>Valor por Aula (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={baseRate}
                onChange={(e) => setBaseRate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Valor pago por cada aula ministrada, independente do número de alunos.
              </p>
            </div>
          )}

          {payType === 'per_student' && (
            <>
              <div className="space-y-2">
                <Label>Valor por Aluno Presente (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={baseRate}
                  onChange={(e) => setBaseRate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Valor por Aluno com Falta (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={noShowRate}
                  onChange={(e) => setNoShowRate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Valor pago quando o aluno falta à aula.
                </p>
              </div>
            </>
          )}

          {payType === 'fixed_monthly' && (
            <div className="space-y-2">
              <Label>Salário Fixo Mensal (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={fixedMonthlyRate}
                onChange={(e) => setFixedMonthlyRate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Valor fixo pago mensalmente, independente de aulas ou alunos.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="accent" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
