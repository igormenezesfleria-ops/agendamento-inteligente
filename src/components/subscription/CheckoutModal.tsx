import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Copy, QrCode, CreditCard, Loader2, CheckCircle } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  days: number;
  price: string;
  priceValue: number;
}

interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: Plan | null;
}

export default function CheckoutModal({ open, onOpenChange, plan }: CheckoutModalProps) {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<string>('pix');
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<{ encodedImage?: string; payload?: string; externalReference?: string } | null>(null);
  const [cardForm, setCardForm] = useState({ name: '', number: '', expiry: '', cvv: '' });

  // Realtime listener for payment confirmation
  useEffect(() => {
    if (!open || !user) return;

    const channel = supabase
      .channel('subscription-status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          const newStatus = (payload.new as any).subscription_status;
          if (newStatus === 'active') {
            toast.success('Pagamento aprovado com sucesso!');
            refreshProfile();
            onOpenChange(false);
            navigate('/dashboard');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, user]);

  const handlePixPayment = async () => {
    if (!user || !plan) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-asaas-payment', {
        body: {
          billingType: 'PIX',
          planId: plan.id,
          planDays: plan.days,
          value: plan.priceValue,
          userId: user.id,
          userEmail: user.email,
        },
      });

      if (error) throw error;
      setPixData({
        encodedImage: data?.pixQrCode?.encodedImage,
        payload: data?.pixQrCode?.payload,
        externalReference: data?.externalReference,
      });
    } catch (err) {
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
          planDays: plan.days,
          value: plan.priceValue,
          userId: user.id,
          userEmail: user.email,
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
    } catch (err) {
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

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setPixData(null);
      setCardForm({ name: '', number: '', expiry: '', cvv: '' });
      setTab('pix');
    }
  }, [open]);

  if (!plan) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            Pagamento — {plan.name}
          </DialogTitle>
          <p className="text-center text-2xl font-bold text-foreground mt-1">{plan.price}</p>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pix" className="gap-2">
              <QrCode className="w-4 h-4" /> PIX
            </TabsTrigger>
            <TabsTrigger value="card" className="gap-2">
              <CreditCard className="w-4 h-4" /> Cartão
            </TabsTrigger>
          </TabsList>

          {/* PIX Tab */}
          <TabsContent value="pix" className="space-y-4 mt-4">
            {!pixData ? (
              <div className="text-center space-y-4">
                <div className="w-32 h-32 mx-auto rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                  <QrCode className="w-12 h-12 text-muted-foreground/40" />
                </div>
                <p className="text-sm text-muted-foreground">Clique abaixo para gerar o QR Code PIX</p>
                <Button onClick={handlePixPayment} disabled={loading} className="w-full">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Gerar PIX
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-4">
                {pixData.encodedImage ? (
                  <img
                    src={`data:image/png;base64,${pixData.encodedImage}`}
                    alt="QR Code PIX"
                    className="w-48 h-48 mx-auto rounded-lg"
                  />
                ) : (
                  <div className="w-48 h-48 mx-auto rounded-xl bg-muted flex items-center justify-center">
                    <QrCode className="w-16 h-16 text-muted-foreground/40" />
                  </div>
                )}

                {pixData.payload && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Pix Copia e Cola</Label>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={pixData.payload}
                        className="text-xs font-mono"
                      />
                      <Button variant="outline" size="icon" onClick={copyPixCode}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Aguardando confirmação do pagamento...
                </div>
              </div>
            )}
          </TabsContent>

          {/* Card Tab */}
          <TabsContent value="card" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div>
                <Label htmlFor="card-name">Nome no Cartão</Label>
                <Input
                  id="card-name"
                  placeholder="Nome completo"
                  value={cardForm.name}
                  onChange={(e) => setCardForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="card-number">Número do Cartão</Label>
                <Input
                  id="card-number"
                  placeholder="0000 0000 0000 0000"
                  value={cardForm.number}
                  onChange={(e) => setCardForm((f) => ({ ...f, number: e.target.value }))}
                  maxLength={19}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="card-expiry">Validade</Label>
                  <Input
                    id="card-expiry"
                    placeholder="MM/AA"
                    value={cardForm.expiry}
                    onChange={(e) => setCardForm((f) => ({ ...f, expiry: e.target.value }))}
                    maxLength={5}
                  />
                </div>
                <div>
                  <Label htmlFor="card-cvv">CVV</Label>
                  <Input
                    id="card-cvv"
                    placeholder="123"
                    value={cardForm.cvv}
                    onChange={(e) => setCardForm((f) => ({ ...f, cvv: e.target.value }))}
                    maxLength={4}
                  />
                </div>
              </div>
            </div>
            <Button onClick={handleCardPayment} disabled={loading} className="w-full" variant="accent">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Pagar Agora
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
