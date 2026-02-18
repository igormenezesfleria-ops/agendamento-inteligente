import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const PLAN_DAYS: Record<string, number> = {
  monthly: 30,
  semiannual: 180,
  annual: 365,
};

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(true);
  const [done, setDone] = useState(false);

  const plan = searchParams.get('plan') || '';

  useEffect(() => {
    const activate = async () => {
      if (!user || !PLAN_DAYS[plan]) {
        setProcessing(false);
        return;
      }

      const days = PLAN_DAYS[plan];
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + days);

      const { error } = await supabase
        .from('profiles')
        .update({
          subscription_status: 'active',
          subscription_plan: plan,
          subscription_expires_at: expiresAt.toISOString(),
        } as any)
        .eq('id', user.id);

      if (error) {
        toast.error('Erro ao ativar assinatura.');
        setProcessing(false);
        return;
      }

      await refreshProfile();
      setDone(true);
      setProcessing(false);
      toast.success('Assinatura ativada com sucesso!');
    };

    activate();
  }, [user, plan]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        {processing ? (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Processando sua assinatura...</p>
          </>
        ) : done ? (
          <>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">Pagamento Confirmado!</h1>
            <p className="text-muted-foreground">
              Seu plano <strong>{plan}</strong> foi ativado. Aproveite!
            </p>
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              Ir para Dashboard
            </Button>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-foreground">Plano inválido</h1>
            <p className="text-muted-foreground">Não foi possível identificar o plano.</p>
            <Button onClick={() => navigate('/subscription')} variant="outline">
              Voltar
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
