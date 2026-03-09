import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Copy, QrCode, CreditCard, Loader2, CheckCircle,
  Ticket, X, Sparkles, Gift,
} from 'lucide-react';

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
}

interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: MembershipPlan | null;
}

export default function CheckoutModal({ open, onOpenChange, plan }: CheckoutModalProps) {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<string>('pix');
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<{ encodedImage?: string; payload?: string } | null>(null);
  const [cardForm, setCardForm] = useState({ name: '', number: '', expiry: '', cvv: '' });

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    id: string;
    code: string;
    discount_percentage: number;
  } | null>(null);
  const [couponError, setCouponError] = useState('');

  const originalPrice = plan?.price ?? 0;
  const discountPct = appliedCoupon?.discount_percentage ?? 0;
  const finalPrice = Math.max(0, originalPrice - (originalPrice * discountPct / 100));
  const isFree = finalPrice === 0 && appliedCoupon !== null;

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setPixData(null);
      setCardForm({ name: '', number: '', expiry: '', cvv: '' });
      setTab('pix');
      setCouponCode('');
      setAppliedCoupon(null);
      setCouponError('');
    }
  }, [open]);

  // Realtime listener for payment confirmation
  useEffect(() => {
    if (!open || !user) return;
    const channel = supabase
      .channel('subscription-status')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${user.id}`,
      }, (payload) => {
        const newStatus = (payload.new as any).subscription_status;
        if (newStatus === 'active') {
          toast.success('Pagamento aprovado com sucesso!');
          refreshProfile();
          onOpenChange(false);
          navigate('/dashboard');
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [open, user]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !user) return;
    setCouponLoading(true);
    setCouponError('');
    try {
      // Find active coupon
      const { data: coupons, error: cErr } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', couponCode.trim().toUpperCase())
        .eq('is_active', true)
        .limit(1);

      if (cErr) throw cErr;
      if (!coupons || coupons.length === 0) {
        setCouponError('Cupom não encontrado ou inativo.');
        return;
      }

      const coupon = coupons[0];

      // Check usage limit
      const { count, error: uErr } = await supabase
        .from('promo_code_usages')
        .select('*', { count: 'exact', head: true })
        .eq('promo_code_id', coupon.id)
        .eq('student_id', user.id);

      if (uErr) throw uErr;
      if ((count ?? 0) >= coupon.max_uses_per_student) {
        setCouponError('Você já utilizou este cupom o máximo de vezes permitido.');
        return;
      }

      setAppliedCoupon({
        id: coupon.id,
        code: coupon.code,
        discount_percentage: Number(coupon.discount_percentage),
      });
    } catch {
      setCouponError('Erro ao verificar cupom.');
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
  };

  const handleFreeActivation = async () => {
    if (!user || !plan || !appliedCoupon) return;
    setLoading(true);
    try {
      if (plan.plan_type === 'class_pack') {
        // Add credits
        const { data: profile } = await supabase
          .from('profiles')
          .select('available_credits')
          .eq('id', user.id)
          .single();
        const currentCredits = profile?.available_credits ?? 0;
        const { error } = await supabase
          .from('profiles')
          .update({ available_credits: currentCredits + (plan.credits_amount ?? 0) })
          .eq('id', user.id);
        if (error) throw error;
      } else {
        // Activate subscription
        const now = new Date();
        const expiresAt = new Date(now);
        if (plan.plan_type === 'monthly') expiresAt.setMonth(expiresAt.getMonth() + 1);
        else if (plan.plan_type === 'yearly') expiresAt.setFullYear(expiresAt.getFullYear() + 1);

        const { error } = await supabase
          .from('profiles')
          .update({
            subscription_status: 'active',
            subscription_plan: plan.name,
            subscription_expires_at: expiresAt.toISOString(),
          })
          .eq('id', user.id);
        if (error) throw error;
      }

      // Track coupon usage
      await supabase.from('promo_code_usages').insert({
        promo_code_id: appliedCoupon.id,
        student_id: user.id,
      });

      toast.success('Plano ativado com sucesso!');
      await refreshProfile();
      onOpenChange(false);
      navigate('/dashboard');
    } catch {
      toast.error('Erro ao ativar plano.');
    } finally {
      setLoading(false);
    }
  };

  const handlePixPayment = async () => {
    if (!user || !plan) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-asaas-payment', {
        body: {
          billingType: 'PIX',
          planId: plan.id,
          planDays: plan.plan_type === 'yearly' ? 365 : plan.plan_type === 'monthly' ? 30 : 0,
          value: finalPrice,
          userId: user.id,
          userEmail: user.email,
          promoCodeId: appliedCoupon?.id,
          creditsAmount: plan.credits_amount,
        },
      });
      if (error) throw error;
      setPixData({
        encodedImage: data?.pixQrCode?.encodedImage,
        payload: data?.pixQrCode?.payload,
      });
    } catch {
      toast.error('Erro ao gerar pagamento PIX.');
    } finally {
      setLoading(false);
    }
  };

  const handleCardPayment = async () => {
    if (!user || !plan) return;
    if (!cardForm.name || !cardForm.number || !cardForm.expiry || !cardForm.cvv) {
      toast.error('Preencha todos os campos do cartão.');
      return;
    }
    setLoading(true);
    try {
      const [expiryMonth, expiryYear] = cardForm.expiry.split('/');
      const { data, error } = await supabase.functions.invoke('create-asaas-payment', {
        body: {
          billingType: 'CREDIT_CARD',
          planId: plan.id,
          planDays: plan.plan_type === 'yearly' ? 365 : plan.plan_type === 'monthly' ? 30 : 0,
          value: finalPrice,
          userId: user.id,
          userEmail: user.email,
          promoCodeId: appliedCoupon?.id,
          creditsAmount: plan.credits_amount,
          creditCard: {
            holderName: cardForm.name,
            number: cardForm.number.replace(/\s/g, ''),
            expiryMonth,
            expiryYear: expiryYear?.length === 2 ? `20${expiryYear}` : expiryYear,
            ccv: cardForm.cvv,
          },
        },
      });
      if (error) throw error;
      if (data?.status === 'CONFIRMED' || data?.status === 'RECEIVED') {
        toast.success('Pagamento aprovado com sucesso!');
        await refreshProfile();
        onOpenChange(false);
        navigate('/dashboard');
      } else {
        toast.error('Pagamento não aprovado. Verifique os dados do cartão.');
      }
    } catch {
      toast.error('Erro ao processar pagamento.');
    } finally {
      setLoading(false);
    }
  };

  const copyPixCode = () => {
    if (pixData?.payload) {
      navigator.clipboard.writeText(pixData.payload);
      toast.success('Código PIX copiado!');
    }
  };

  if (!plan) return null;

  const showPix = plan.accepts_pix;
  const showCard = plan.accepts_credit;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">{plan.name}</DialogTitle>
        </DialogHeader>

        {/* Price display */}
        <div className="text-center space-y-1 py-2">
          {appliedCoupon ? (
            <>
              <p className="text-sm text-muted-foreground line-through">
                R$ {originalPrice.toFixed(2).replace('.', ',')}
              </p>
              <p className="text-3xl font-bold text-foreground">
                {isFree ? 'GRÁTIS' : `R$ ${finalPrice.toFixed(2).replace('.', ',')}`}
              </p>
              <Badge className="bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] border-[hsl(var(--success))]/30">
                <Ticket className="w-3 h-3 mr-1" />
                {appliedCoupon.code} — {discountPct}% off
              </Badge>
            </>
          ) : (
            <p className="text-3xl font-bold text-foreground">
              R$ {originalPrice.toFixed(2).replace('.', ',')}
            </p>
          )}
        </div>

        {/* Coupon section */}
        <div className="space-y-2">
          {!appliedCoupon ? (
            <div className="flex gap-2">
              <Input
                placeholder="Possui um cupom?"
                value={couponCode}
                onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}
                className="uppercase font-mono text-sm"
                maxLength={20}
              />
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5"
                onClick={handleApplyCoupon}
                disabled={!couponCode.trim() || couponLoading}
              >
                {couponLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ticket className="w-3.5 h-3.5" />}
                Aplicar
              </Button>
            </div>
          ) : (
            <button
              onClick={removeCoupon}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3 h-3" /> Remover cupom
            </button>
          )}
          {couponError && (
            <p className="text-xs text-destructive">{couponError}</p>
          )}
        </div>

        {/* FREE activation */}
        {isFree ? (
          <div className="space-y-3 pt-2">
            <div className="rounded-xl border border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/5 p-4 text-center space-y-2">
              <Gift className="w-8 h-8 text-[hsl(var(--success))] mx-auto" />
              <p className="text-sm font-medium text-foreground">
                {plan.plan_type === 'class_pack'
                  ? `${plan.credits_amount} aulas serão adicionadas ao seu saldo.`
                  : 'Seu plano será ativado imediatamente.'}
              </p>
            </div>
            <Button
              variant="success"
              className="w-full gap-2"
              onClick={handleFreeActivation}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Ativar Plano Gratuitamente
            </Button>
          </div>
        ) : (
          /* Payment tabs */
          <Tabs value={tab} onValueChange={setTab} className="mt-1">
            {showPix && showCard ? (
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="pix" className="gap-2">
                  <QrCode className="w-4 h-4" /> PIX
                </TabsTrigger>
                <TabsTrigger value="card" className="gap-2">
                  <CreditCard className="w-4 h-4" /> Cartão
                </TabsTrigger>
              </TabsList>
            ) : null}

            {showPix && (
              <TabsContent value="pix" className="space-y-4 mt-4">
                {!pixData ? (
                  <div className="text-center space-y-4">
                    <div className="w-32 h-32 mx-auto rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                      <QrCode className="w-12 h-12 text-muted-foreground/40" />
                    </div>
                    <p className="text-sm text-muted-foreground">Clique para gerar o QR Code PIX</p>
                    <Button onClick={handlePixPayment} disabled={loading} className="w-full">
                      {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      Gerar PIX
                    </Button>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    {pixData.encodedImage && (
                      <img
                        src={`data:image/png;base64,${pixData.encodedImage}`}
                        alt="QR Code PIX"
                        className="w-48 h-48 mx-auto rounded-lg"
                      />
                    )}
                    {pixData.payload && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Pix Copia e Cola</Label>
                        <div className="flex gap-2">
                          <Input readOnly value={pixData.payload} className="text-xs font-mono" />
                          <Button variant="outline" size="icon" onClick={copyPixCode}>
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Aguardando confirmação...
                    </div>
                  </div>
                )}
              </TabsContent>
            )}

            {showCard && (
              <TabsContent value="card" className="space-y-4 mt-4">
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="card-name">Nome no Cartão</Label>
                    <Input id="card-name" placeholder="Nome completo" value={cardForm.name}
                      onChange={(e) => setCardForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div>
                    <Label htmlFor="card-number">Número do Cartão</Label>
                    <Input id="card-number" placeholder="0000 0000 0000 0000" value={cardForm.number}
                      onChange={(e) => setCardForm(f => ({ ...f, number: e.target.value }))} maxLength={19} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="card-expiry">Validade</Label>
                      <Input id="card-expiry" placeholder="MM/AA" value={cardForm.expiry}
                        onChange={(e) => setCardForm(f => ({ ...f, expiry: e.target.value }))} maxLength={5} />
                    </div>
                    <div>
                      <Label htmlFor="card-cvv">CVV</Label>
                      <Input id="card-cvv" placeholder="123" value={cardForm.cvv}
                        onChange={(e) => setCardForm(f => ({ ...f, cvv: e.target.value }))} maxLength={4} />
                    </div>
                  </div>
                </div>
                <Button onClick={handleCardPayment} disabled={loading} className="w-full" variant="accent">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  Pagar R$ {finalPrice.toFixed(2).replace('.', ',')}
                </Button>
              </TabsContent>
            )}

            {/* Auto-select if only one method */}
            {showPix && !showCard && tab !== 'pix' ? <>{setTab('pix')}</> : null}
            {!showPix && showCard && tab !== 'card' ? <>{setTab('card')}</> : null}
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
