import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

const PAR_Q_QUESTIONS = [
  'Algum médico já disse que você possui algum problema de coração e que só deveria realizar atividade física supervisionada por profissionais de saúde?',
  'Você sente dor no peito quando pratica atividade física?',
  'No último mês, você sentiu dor no peito quando praticou atividade física?',
  'Você apresenta desequilíbrio devido à tontura e/ou perda de consciência?',
  'Você possui algum problema ósseo ou articular que poderia ser piorado pela atividade física?',
  'Você toma atualmente algum medicamento para pressão arterial e/ou problema de coração?',
  'Sabe de alguma outra razão pela qual você não deveria praticar atividade física?',
];

interface LiabilityWaiverOverlayProps {
  open: boolean;
  onAccepted: () => void;
}

export function LiabilityWaiverOverlay({ open, onAccepted }: LiabilityWaiverOverlayProps) {
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [answers, setAnswers] = useState<Record<number, boolean | null>>(
    Object.fromEntries(PAR_Q_QUESTIONS.map((_, i) => [i, null]))
  );
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const allAnswered = PAR_Q_QUESTIONS.every((_, i) => answers[i] !== null);
  const hasYes = Object.values(answers).some((v) => v === true);
  const canSubmit = allAnswered && agreed;

  const setAnswer = (index: number, value: boolean) => {
    setAnswers((prev) => ({ ...prev, [index]: value }));
  };

  const handleAccept = async () => {
    if (!user || !canSubmit) return;
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
        <div className="overflow-y-auto p-6 pt-4 flex-1">
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            Este questionário tem como objetivo identificar a necessidade de avaliação clínica antes do início de um programa de exercícios. Responda cada pergunta com honestidade.
          </p>

          <div className="space-y-3 mb-5">
            {PAR_Q_QUESTIONS.map((q, i) => (
              <div key={i} className="bg-muted/50 p-4 rounded-xl border border-border">
                <div className="flex gap-2.5 mb-3">
                  <span className="text-accent font-bold text-xs mt-0.5 shrink-0">{i + 1}.</span>
                  <p className="text-sm font-medium text-foreground leading-snug">{q}</p>
                </div>
                <div className="flex gap-2 ml-5">
                  <button
                    type="button"
                    onClick={() => setAnswer(i, true)}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${
                      answers[i] === true
                        ? 'bg-destructive/10 text-destructive border-destructive/50'
                        : 'bg-card text-muted-foreground border-border hover:border-muted-foreground/30'
                    }`}
                  >
                    Sim
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnswer(i, false)}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${
                      answers[i] === false
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/50'
                        : 'bg-card text-muted-foreground border-border hover:border-muted-foreground/30'
                    }`}
                  >
                    Não
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-muted/50 rounded-2xl p-4 border border-border">
            <h4 className="font-bold text-foreground text-sm mb-2">Termo de Responsabilidade</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Declaro, para os devidos fins, que fui informado(a) sobre a importância de realizar avaliação médica antes do início de qualquer programa de exercícios. Ao aceitar este termo, estou ciente dos riscos inerentes à prática de atividades físicas e assumo total responsabilidade por minha participação. Isento o(a) profissional de Educação Física e o estabelecimento de quaisquer responsabilidades caso eu não apresente atestado médico quando solicitado.
            </p>
          </div>
        </div>

        {/* Clinical Warning */}
        {hasYes && (
          <div className="bg-destructive/5 border-l-4 border-destructive p-4 mx-6 mb-0 rounded-r-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-destructive text-sm font-semibold leading-snug">
                Atenção: Como você respondeu "Sim" a uma ou mais perguntas, é obrigatória a avaliação e liberação médica antes do início dos treinos.
              </p>
            </div>
          </div>
        )}

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
            disabled={!canSubmit || saving}
            className={`w-full py-4 rounded-xl font-bold text-lg shadow-md transition-all flex items-center justify-center gap-2 ${
              canSubmit
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
