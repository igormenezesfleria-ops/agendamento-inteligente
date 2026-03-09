import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, RotateCcw, PlusCircle, Zap, Sparkles, CreditCard } from 'lucide-react';

interface Props {
  studentId: string;
  studentName: string | null;
}

export function StudentDevTools({ studentId, studentName }: Props) {
  const qc = useQueryClient();

  const { data: profile, isLoading, refetch } = useQuery({
    queryKey: ['student-dev-profile', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('available_credits, subscription_status, subscription_plan, subscription_expires_at')
        .eq('id', studentId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('profiles')
        .update({
          available_credits: 0,
          subscription_status: 'inactive',
          subscription_plan: null,
          subscription_expires_at: null,
        })
        .eq('id', studentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`${studentName} resetado: 0 créditos, sem plano ativo.`);
      refetch();
      qc.invalidateQueries({ queryKey: ['my-students'] });
    },
    onError: () => toast.error('Erro ao resetar aluno.'),
  });

  const injectCreditsMutation = useMutation({
    mutationFn: async () => {
      const current = profile?.available_credits ?? 0;
      const { error } = await supabase
        .from('profiles')
        .update({ available_credits: current + 5 })
        .eq('id', studentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`+5 créditos adicionados para ${studentName}!`);
      refetch();
      qc.invalidateQueries({ queryKey: ['my-students'] });
    },
    onError: () => toast.error('Erro ao injetar créditos.'),
  });

  const simulatePlanMutation = useMutation({
    mutationFn: async () => {
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);
      const { error } = await supabase
        .from('profiles')
        .update({
          subscription_status: 'active',
          subscription_plan: 'Mensal (Simulado)',
          subscription_expires_at: expiresAt.toISOString(),
        })
        .eq('id', studentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Plano Mensal simulado ativado para ${studentName}!`);
      refetch();
      qc.invalidateQueries({ queryKey: ['my-students'] });
    },
    onError: () => toast.error('Erro ao simular plano.'),
  });

  const isAnyLoading = resetMutation.isPending || injectCreditsMutation.isPending || simulatePlanMutation.isPending;

  return (
    <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-base">🛠️</span>
        <h4 className="font-semibold text-sm text-foreground">Ferramentas de Teste (Dev Mode)</h4>
      </div>

      {/* Current state */}
      {isLoading ? (
        <div className="flex justify-center py-3">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-background border border-border">
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              <p className="text-xs text-muted-foreground">Créditos</p>
            </div>
            <p className="text-xl font-bold text-foreground">{profile?.available_credits ?? 0}</p>
          </div>
          <div className="p-3 rounded-lg bg-background border border-border">
            <div className="flex items-center gap-1.5 mb-1">
              <CreditCard className="w-3.5 h-3.5 text-accent" />
              <p className="text-xs text-muted-foreground">Plano</p>
            </div>
            {profile?.subscription_status === 'active' ? (
              <div>
                <Badge className="bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] border-[hsl(var(--success))]/30 text-xs">
                  Ativo
                </Badge>
                <p className="text-xs text-muted-foreground mt-1 truncate">{profile?.subscription_plan || '—'}</p>
              </div>
            ) : (
              <Badge variant="outline" className="text-xs">Inativo</Badge>
            )}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="grid gap-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
          onClick={() => resetMutation.mutate()}
          disabled={isAnyLoading}
        >
          {resetMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
          🔴 Resetar Aluno (Zerar Tudo)
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 text-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/10 border-[hsl(var(--success))]/30"
          onClick={() => injectCreditsMutation.mutate()}
          disabled={isAnyLoading}
        >
          {injectCreditsMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlusCircle className="w-3.5 h-3.5" />}
          🟢 Injetar 5 Créditos
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 text-primary hover:bg-primary/10 border-primary/30"
          onClick={() => simulatePlanMutation.mutate()}
          disabled={isAnyLoading}
        >
          {simulatePlanMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
          🟣 Simular Plano Mensal
        </Button>
      </div>
    </div>
  );
}
