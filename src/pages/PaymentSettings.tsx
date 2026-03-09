import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  CreditCard,
  Eye,
  EyeOff,
  Loader2,
  Shield,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Wallet,
  ArrowLeft,
  Pause,
  Play,
} from 'lucide-react';

type ViewState = 'loading' | 'not_connected' | 'input_key' | 'connected';

export default function PaymentSettings() {
  const { user } = useAuth();
  const [paymentsEnabled, setPaymentsEnabled] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<ViewState>('loading');

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
        setView(data.asaas_api_key ? 'connected' : 'not_connected');
      } else {
        setView('not_connected');
      }
    })();
  }, [user?.id]);

  const handleConnect = async () => {
    if (!user?.id || !apiKey.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ payments_enabled: true, asaas_api_key: apiKey.trim() })
      .eq('id', user.id);
    setSaving(false);
    if (error) {
      toast.error('Erro ao conectar conta.');
    } else {
      setPaymentsEnabled(true);
      setView('connected');
      toast.success('Conta conectada com sucesso!');
    }
  };

  const handleTogglePayments = async (enabled: boolean) => {
    if (!user?.id) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ payments_enabled: enabled })
      .eq('id', user.id);
    setSaving(false);
    if (error) {
      toast.error('Erro ao atualizar configuração.');
    } else {
      setPaymentsEnabled(enabled);
      toast.success(enabled ? 'Pagamentos ativados!' : 'Pagamentos pausados.');
    }
  };

  const handleDisconnect = async () => {
    if (!user?.id) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ payments_enabled: false, asaas_api_key: null })
      .eq('id', user.id);
    setSaving(false);
    if (error) {
      toast.error('Erro ao desconectar.');
    } else {
      setPaymentsEnabled(false);
      setApiKey('');
      setView('not_connected');
      toast.success('Conta desconectada.');
    }
  };

  if (view === 'loading') {
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
          <h1 className="font-display text-2xl sm:text-3xl text-foreground">Conta para Recebimentos</h1>
          <p className="text-muted-foreground text-sm">Receba pagamentos de planos e pacotes diretamente dos seus alunos.</p>
        </div>

        {/* State: Not Connected */}
        {view === 'not_connected' && (
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {/* Decorative header */}
              <div className="bg-gradient-to-br from-primary to-primary/80 px-6 py-8 text-primary-foreground text-center space-y-3">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-primary-foreground/15 backdrop-blur flex items-center justify-center">
                  <Wallet className="w-7 h-7" />
                </div>
                <h2 className="text-xl font-bold">Comece a receber pagamentos</h2>
                <p className="text-primary-foreground/80 text-sm max-w-md mx-auto">
                  Para receber pagamentos via PIX e Cartão de Crédito diretamente no aplicativo, conecte sua conta Asaas.
                </p>
              </div>

              <div className="p-6 space-y-4">
                {/* Benefits */}
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { icon: CreditCard, label: 'PIX e Cartão', desc: 'Aceite múltiplos métodos' },
                    { icon: Shield, label: 'Seguro', desc: 'Dados criptografados' },
                    { icon: CheckCircle2, label: 'Gratuito', desc: 'Conta sem mensalidade' },
                  ].map((b) => (
                    <div key={b.label} className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
                      <b.icon className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-foreground text-sm">{b.label}</p>
                        <p className="text-xs text-muted-foreground">{b.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => window.open('https://www.asaas.com/registrar', '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Como criar minha conta gratuita
                  </Button>
                  <Button
                    className="flex-1 gap-2"
                    onClick={() => setView('input_key')}
                  >
                    <KeyRound className="w-4 h-4" />
                    Já tenho conta, conectar chave
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* State: Inputting Key */}
        {view === 'input_key' && (
          <Card>
            <CardContent className="p-6 space-y-5">
              <button
                onClick={() => setView('not_connected')}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <KeyRound className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h2 className="font-bold text-foreground text-lg">Conectar Conta Asaas</h2>
                  <p className="text-muted-foreground text-sm">Insira sua chave de API para conectar sua conta.</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="asaas-key" className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  Chave de API (API Key)
                </Label>
                <div className="relative">
                  <Input
                    id="asaas-key"
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="$aact_..."
                    className="pr-10 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Encontre em: <span className="font-medium text-foreground">Asaas → Configurações → Integrações → API Key</span>
                </p>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-3 flex items-start gap-3">
                <Shield className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Sua chave é armazenada com criptografia e nunca será exibida para outras pessoas. Ela é usada exclusivamente para processar cobranças dos seus alunos.
                </p>
              </div>

              <Button
                onClick={handleConnect}
                disabled={saving || !apiKey.trim()}
                className="w-full gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Conectar Conta
              </Button>
            </CardContent>
          </Card>
        )}

        {/* State: Connected */}
        {view === 'connected' && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-6 space-y-5">
                {/* Connected header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[hsl(var(--success))]/10 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-[hsl(var(--success))]" />
                    </div>
                    <div>
                      <h2 className="font-bold text-foreground text-lg">Conta Asaas</h2>
                      <p className="text-muted-foreground text-sm">Gateway de pagamentos</p>
                    </div>
                  </div>
                  <Badge className="bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] border-[hsl(var(--success))]/30 hover:bg-[hsl(var(--success))]/20">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Conectada
                  </Badge>
                </div>

                {/* Global toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30">
                  <div className="flex items-center gap-3">
                    {paymentsEnabled ? (
                      <Play className="w-5 h-5 text-[hsl(var(--success))]" />
                    ) : (
                      <Pause className="w-5 h-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium text-foreground text-sm">
                        {paymentsEnabled ? 'Pagamentos online ativos' : 'Pagamentos online pausados'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {paymentsEnabled
                          ? 'Seus alunos podem contratar planos e pacotes pelo app.'
                          : 'A vitrine de planos está oculta para seus alunos.'}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={paymentsEnabled}
                    onCheckedChange={handleTogglePayments}
                    disabled={saving}
                  />
                </div>

                {/* API Key masked display */}
                <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30">
                  <div className="flex items-center gap-3">
                    <KeyRound className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground text-sm">Chave de API</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {apiKey ? `${apiKey.substring(0, 12)}${'•'.repeat(16)}` : '••••••••••••••••'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Disconnect option */}
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5 text-xs"
                onClick={handleDisconnect}
                disabled={saving}
              >
                Desconectar conta
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
