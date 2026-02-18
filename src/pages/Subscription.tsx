import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Crown, Sparkles, Shield, Zap } from 'lucide-react';

const PLANS = [
  {
    id: 'monthly',
    name: 'Passe Mensal',
    days: 30,
    price: 'R$ 34,90',
    priceNum: 34.9,
    description: '30 dias de acesso completo',
    icon: Zap,
    href: '#',
  },
  {
    id: 'semiannual',
    name: 'Passe Semestral',
    days: 180,
    price: 'R$ 179,90',
    priceNum: 179.9,
    description: '180 dias de acesso completo',
    icon: Shield,
    popular: true,
    href: '#',
  },
  {
    id: 'annual',
    name: 'Passe Anual',
    days: 365,
    price: 'R$ 349,90',
    priceNum: 349.9,
    description: '365 dias de acesso completo',
    icon: Crown,
    href: '#',
  },
];

export default function Subscription() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [vipCode, setVipCode] = useState('');
  const [activating, setActivating] = useState(false);

  const handleActivateVip = async () => {
    if (!user) return;
    if (vipCode.trim() !== 'IGOR_MASTER_2025') {
      toast.error('Código inválido.');
      return;
    }

    setActivating(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_status: 'vip',
        subscription_expires_at: '2099-12-31T23:59:59Z',
        vip_code_used: true,
      } as any)
      .eq('id', user.id);

    if (error) {
      toast.error('Erro ao ativar código.');
      setActivating(false);
      return;
    }

    await refreshProfile();
    toast.success('Acesso VIP ativado com sucesso!');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Gestão Profissional — Acesso Premium
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Escolha seu passe de acesso. Pagamento único, sem renovação automática.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <Card
              key={plan.id}
              className={`relative flex flex-col ${plan.popular ? 'border-primary shadow-lg ring-2 ring-primary/20' : ''}`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                  Mais popular
                </Badge>
              )}
              <CardHeader className="text-center pb-2">
                <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                  <plan.icon className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="text-center flex-1">
                <p className="text-3xl font-bold text-foreground">{plan.price}</p>
                <p className="text-xs text-muted-foreground mt-1">pagamento único</p>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full" variant={plan.popular ? 'default' : 'outline'}>
                  <a href={plan.href}>Escolher Plano</a>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* VIP Section */}
        <div className="border-t border-border pt-6 mt-8">
          <div className="max-w-sm mx-auto space-y-3">
            <p className="text-sm text-muted-foreground text-center">Código Promocional</p>
            <div className="flex gap-2">
              <Input
                placeholder="Digite o código"
                value={vipCode}
                onChange={(e) => setVipCode(e.target.value)}
              />
              <Button onClick={handleActivateVip} disabled={activating || !vipCode.trim()}>
                {activating ? 'Ativando...' : 'Ativar'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
