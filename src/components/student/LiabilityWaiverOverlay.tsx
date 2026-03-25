import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface LiabilityWaiverOverlayProps {
  open: boolean;
  onAccepted: () => void;
}

export function LiabilityWaiverOverlay({ open, onAccepted }: LiabilityWaiverOverlayProps) {
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleAccept = async () => {
    if (!user || !agreed) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        liability_accepted: true,
        liability_accepted_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    setSaving(false);
    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível salvar. Tente novamente.', variant: 'destructive' });
      return;
    }
    toast({ title: '✅ Termo aceito!', description: 'Bem-vindo ao seu espaço de treino.' });
    await refreshProfile();
    onAccepted();
  };

  return (
    <div className="fixed inset-0 bg-foreground/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-card rounded-3xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] shadow-2xl">
        {/* Header */}
        <div className="p-6 pb-2">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-accent" />
            </div>
            <h2 className="text-2xl font-extrabold text-foreground">
              Termo de Responsabilidade
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">PAR-Q — Questionário de Prontidão para Atividade Física</p>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 pt-4 text-muted-foreground text-sm leading-relaxed flex-1">
          <p className="mb-4">
            Este questionário tem como objetivo identificar a necessidade de avaliação clínica antes do início de um programa de exercícios. Leia atentamente cada pergunta e responda de forma honesta.
          </p>

          <div className="space-y-3 mb-6">
            {[
              'Algum médico já disse que você possui algum problema de coração e que só deveria realizar atividade física supervisionada por profissionais de saúde?',
              'Você sente dor no peito quando pratica atividade física?',
              'No último mês, você sentiu dor no peito quando praticou atividade física?',
              'Você apresenta desequilíbrio devido à tontura e/ou perda de consciência?',
              'Você possui algum problema ósseo ou articular que poderia ser piorado pela atividade física?',
              'Você toma atualmente algum medicamento para pressão arterial e/ou problema de coração?',
              'Sabe de alguma outra razão pela qual você não deveria praticar atividade física?',
            ].map((q, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-accent font-bold text-xs mt-0.5">{i + 1}.</span>
                <p>{q}</p>
              </div>
            ))}
          </div>

          <div className="bg-muted/50 rounded-2xl p-4 border border-border">
            <h4 className="font-bold text-foreground text-sm mb-2">Termo de Responsabilidade</h4>
            <p className="text-xs leading-relaxed">
              Declaro, para os devidos fins, que fui informado(a) sobre a importância de realizar avaliação médica antes do início de qualquer programa de exercícios. Ao aceitar este termo, estou ciente dos riscos inerentes à prática de atividades físicas e assumo total responsabilidade por minha participação. Isento o(a) profissional de Educação Física e o estabelecimento de quaisquer responsabilidades caso eu não apresente atestado médico quando solicitado.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border bg-muted/30">
          <label className="flex items-start gap-3 cursor-pointer mb-4">
            <Checkbox
              checked={agreed}
              onCheckedChange={(v) => setAgreed(v === true)}
              className="mt-0.5"
            />
            <span className="text-sm text-foreground font-medium leading-snug">
              Li e concordo com os termos de saúde e responsabilidade acima.
            </span>
          </label>
          <button
            onClick={handleAccept}
            disabled={!agreed || saving}
            className={`w-full py-4 rounded-xl font-bold text-lg shadow-md transition-all flex items-center justify-center gap-2 ${
              agreed
                ? 'bg-accent hover:bg-accent/90 text-accent-foreground'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
          >
            {saving && <Loader2 className="w-5 h-5 animate-spin" />}
            Assinar e Começar
          </button>
        </div>
      </div>
    </div>
  );
}
