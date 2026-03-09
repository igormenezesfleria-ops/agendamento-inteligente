import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Package, ShoppingBag, CreditCard, Sparkles, QrCode, CalendarCheck } from 'lucide-react';
import CheckoutModal from '@/components/subscription/CheckoutModal';

interface MembershipPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  plan_type: 'monthly' | 'yearly' | 'class_pack';
  credits_amount: number | null;
  classes_per_week: number | null;
  validity_months: number | null;
  accepts_pix: boolean;
  accepts_credit: boolean;
  is_active: boolean;
}

const PLAN_TYPE_LABELS: Record<string, string> = {
  monthly: 'Mensal',
  yearly: 'Anual',
  class_pack: 'Pacote de Aulas',
};

export default function StudentPlans() {
  const { profile } = useAuth();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentsEnabled, setPaymentsEnabled] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => {
    if (!profile?.business_owner_id) return;
    fetchData();
  }, [profile?.business_owner_id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [plansRes, adminRes] = await Promise.all([
        supabase
          .from('membership_plans')
          .select('*')
          .eq('is_active', true)
          .order('price', { ascending: true }),
        supabase
          .from('profiles')
          .select('payments_enabled')
          .eq('id', profile!.business_owner_id!)
          .single(),
      ]);
      if (plansRes.data) setPlans(plansRes.data as MembershipPlan[]);
      if (adminRes.data) setPaymentsEnabled(adminRes.data.payments_enabled);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = (plan: MembershipPlan) => {
    setSelectedPlan(plan);
    setCheckoutOpen(true);
  };

  const credits = profile?.available_credits ?? 0;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Planos e Pacotes</h1>
          <p className="text-muted-foreground mt-1">Escolha o plano ideal para seus treinos</p>
        </div>

        {/* Credits banner */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-4 py-5">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Saldo atual</p>
              <p className="text-2xl font-bold text-foreground">
                {credits} {credits === 1 ? 'aula disponível' : 'aulas disponíveis'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Plans grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : plans.length === 0 ? (
          <Card className="py-16">
            <CardContent className="flex flex-col items-center text-center gap-4">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                <Package className="w-10 h-10 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Nenhum plano disponível no momento</h3>
                <p className="text-muted-foreground mt-1">Seu personal ainda não cadastrou planos.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card key={plan.id} className="flex flex-col hover:shadow-lg transition-shadow border-border/60">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">
                      {PLAN_TYPE_LABELS[plan.plan_type] || plan.plan_type}
                    </Badge>
                    {plan.plan_type === 'class_pack' && plan.credits_amount && (
                      <Badge variant="outline" className="text-xs">{plan.credits_amount} aulas</Badge>
                    )}
                  </div>
                  <CardTitle className="text-xl mt-2">{plan.name}</CardTitle>
                  {plan.description && (
                    <CardDescription className="line-clamp-2">{plan.description}</CardDescription>
                  )}
                </CardHeader>

                <CardContent className="flex-1 space-y-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-foreground">
                      R$ {plan.price.toFixed(2).replace('.', ',')}
                    </span>
                    {plan.plan_type === 'monthly' && <span className="text-sm text-muted-foreground">/mês</span>}
                    {plan.plan_type === 'yearly' && <span className="text-sm text-muted-foreground">/ano</span>}
                  </div>

                  {/* Metadata badges */}
                  <div className="flex flex-wrap gap-1.5">
                    {(plan.plan_type === 'monthly' || plan.plan_type === 'yearly') && plan.classes_per_week && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <CalendarCheck className="w-3 h-3" /> {plan.classes_per_week}x/semana
                      </Badge>
                    )}
                    {plan.plan_type === 'class_pack' && plan.validity_months && (
                      <Badge variant="outline" className="text-xs">{plan.validity_months} meses validade</Badge>
                    )}
                    {plan.accepts_pix && (
                      <Badge variant="outline" className="text-xs gap-1"><QrCode className="w-3 h-3" /> PIX</Badge>
                    )}
                    {plan.accepts_credit && (
                      <Badge variant="outline" className="text-xs gap-1"><CreditCard className="w-3 h-3" /> Cartão</Badge>
                    )}
                  </div>
                </CardContent>

                <CardFooter>
                  {paymentsEnabled ? (
                    <Button className="w-full gap-2" onClick={() => handleBuy(plan)}>
                      <ShoppingBag className="w-4 h-4" /> Comprar
                    </Button>
                  ) : (
                    <Button className="w-full gap-2" variant="outline" disabled>
                      <CreditCard className="w-4 h-4" /> Pagamentos desativados
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CheckoutModal
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        plan={selectedPlan}
      />
    </DashboardLayout>
  );
}
