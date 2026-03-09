import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { CreditCard, Eye, EyeOff, Loader2, Shield, Zap } from 'lucide-react';

export default function PaymentSettings() {
  const { user } = useAuth();
  const [paymentsEnabled, setPaymentsEnabled] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('payments_enabled, asaas_api_key')
        .eq('id', user.id)
        .single();
      if (data) {
        setPaymentsEnabled(data.payments_enabled ?? false);
        setApiKey(data.asaas_api_key ?? '');
      }
      setLoading(false);
    })();
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        payments_enabled: paymentsEnabled,
        asaas_api_key: paymentsEnabled ? apiKey : null,
      })
      .eq('id', user.id);
    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar configurações');
    } else {
      toast.success('Configurações salvas com sucesso!');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl animate-fade-in">
        <div className="space-y-1">
          <h1 className="font-display text-2xl sm:text-3xl text-foreground">Financeiro & Pagamentos</h1>
          <p className="text-muted-foreground">Configure a integração com o gateway de pagamentos.</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-accent" />
              </div>
              <div>
                <CardTitle className="text-lg">Gateway Asaas</CardTitle>
                <CardDescription>Habilite cobranças automáticas para seus alunos.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-accent" />
                <div>
                  <p className="font-medium text-foreground text-sm">Habilitar Pagamentos via Asaas</p>
                  <p className="text-xs text-muted-foreground">Ative para cobrar planos e pacotes dos alunos</p>
                </div>
              </div>
              <Switch
                checked={paymentsEnabled}
                onCheckedChange={setPaymentsEnabled}
              />
            </div>

            {paymentsEnabled && (
              <div className="space-y-3 animate-fade-in">
                <Label htmlFor="asaas-key" className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  Asaas API Key
                </Label>
                <div className="relative">
                  <Input
                    id="asaas-key"
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="$aact_..."
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Encontre sua chave em: Asaas → Configurações → Integrações → API Key
                </p>
              </div>
            )}

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Salvar Configurações
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
