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
import CheckoutModal from '@/components/subscription/CheckoutModal';

const PLANS = [
  {
    id: 'monthly',
    name: 'Mensal',
    days: 30,
    price: 'R$ 34,90',
    priceValue: 34.9,
    subtitle: 'Cobrado a cada 30 dias',
    helperText: null as string | null,
    icon: Zap,
    badge: 'Sem fidelidade',
    badgeVariant: 'secondary' as const,
    highlight: false,
  },
  {
    id: 'semiannual',
    name: 'Semestral',
    days: 180,
    price: 'R$ 189,90',
    priceValue: 189.9,
    subtitle: 'Pagamento único',
    helperText: 'Equivalente a R$ 31,65/mês',
    icon: Shield,
    badge: '10% OFF',
    badgeVariant: 'confirmed' as const,
    highlight: false,
  },
  {
    id: 'annual',
    name: 'Anual Profissional',
    days: 365,
    price: 'R$ 349,90',
    priceValue: 349.9,
    subtitle: 'Pagamento único',
    helperText: 'Equivalente a R$ 29,15/mês',
    icon: Crown,
    badge: 'Recomendado · 16% OFF',
    badgeVariant: 'default' as const,
    highlight: true,
  },
];

export default function Subscription() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [vipCode, setVipCode] = useState('');
  const [activating, setActivating] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<typeof PLANS[number] | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

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

  const openCheckout = (plan: typeof PLANS[number]) => {
    setSelectedPlan(plan);
    setCheckoutOpen(true);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 md:p-6">
      <div className="max-w-4xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Acesso Premium
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto text-sm">
            Pagamento único, sem renovação automática. Escolha o melhor plano para você.
          </p>
        </div>

        {/* Plans - Desktop grid / Mobile horizontal scroll */}
        <div className="hidden md:grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <PlanCard key={plan.id} plan={plan} onSelect={openCheckout} />
          ))}
        </div>

        {/* Mobile: horizontal snap scroll */}
        <div className="flex md:hidden gap-4 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4">
          {PLANS.map((plan) => (
            <div key={plan.id} className="snap-center shrink-0 w-[280px]">
              <PlanCard plan={plan} onSelect={openCheckout} />
            </div>
          ))}
        </div>

        {/* VIP Section */}
        <div className="border-t border-border pt-6">
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

      <CheckoutModal
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        plan={selectedPlan}
      />
    </div>
  );
}

function PlanCard({ plan, onSelect }: { plan: typeof PLANS[number]; onSelect: (p: typeof PLANS[number]) => void }) {
  return (
    <Card
      className={`relative flex flex-col h-full ${plan.highlight ? 'border-accent shadow-lg ring-2 ring-accent/30 scale-[1.02]' : ''}`}
    >
      <Badge
        variant={plan.badgeVariant}
        className={`absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap ${plan.highlight ? 'bg-accent text-accent-foreground' : ''}`}
      >
        {plan.badge}
      </Badge>
      <CardHeader className="text-center pb-2">
        <div className={`mx-auto w-12 h-12 rounded-xl flex items-center justify-center mb-2 ${plan.highlight ? 'bg-accent/15' : 'bg-primary/10'}`}>
          <plan.icon className={`w-6 h-6 ${plan.highlight ? 'text-accent' : 'text-primary'}`} />
        </div>
        <CardTitle className="text-lg">{plan.name}</CardTitle>
        <CardDescription>{plan.subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="text-center flex-1">
        <p className="text-3xl font-bold text-foreground">{plan.price}</p>
        {plan.helperText && (
          <p className="text-xs text-muted-foreground mt-1">{plan.helperText}</p>
        )}
      </CardContent>
      <CardFooter>
        <Button className="w-full" variant={plan.highlight ? 'accent' : 'outline'} onClick={() => onSelect(plan)}>
          Escolher Plano
        </Button>
      </CardFooter>
    </Card>
  );
}
