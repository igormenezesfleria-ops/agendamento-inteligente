import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ShieldCheck, AlertTriangle, ClipboardList, CheckCircle2 } from 'lucide-react';

const OBJECTIVES = [
  { value: 'emagrecimento', label: 'Emagrecimento' },
  { value: 'hipertrofia', label: 'Hipertrofia' },
  { value: 'saude', label: 'Saúde / Condicionamento' },
  { value: 'reabilitacao', label: 'Reabilitação' },
  { value: 'alta_performance', label: 'Alta Performance' },
];

const PAR_Q_QUESTIONS = [
  'Algum médico já disse que você possui algum problema de coração e que só deveria realizar atividade física supervisionada por profissionais de saúde?',
  'Você sente dor no peito quando pratica atividade física?',
  'No último mês, você sentiu dor no peito quando praticou atividade física?',
  'Você apresenta desequilíbrio devido à tontura e/ou perda de consciência?',
  'Você possui algum problema ósseo ou articular que poderia ser piorado pela atividade física?',
  'Você toma atualmente algum medicamento para pressão arterial e/ou problema de coração?',
  'Sabe de alguma outra razão pela qual você não deveria praticar atividade física?',
];

interface StudentOnboardingFlowProps {
  /** start at parq when triage already completed but liability still pending */
  startStep?: 'triage' | 'parq';
  onCompleted: () => void;
}

export function StudentOnboardingFlow({ startStep = 'triage', onCompleted }: StudentOnboardingFlowProps) {
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<'triage' | 'parq'>(startStep);

  // Triage state
  const [savingTriage, setSavingTriage] = useState(false);
  const [phone, setPhone] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [objective, setObjective] = useState('');
  const [hasInjury, setHasInjury] = useState(false);
  const [injuryDetails, setInjuryDetails] = useState('');
  const [isActivePhysical, setIsActivePhysical] = useState(false);
  const [height, setHeight] = useState('');
  const [birthDate, setBirthDate] = useState('');

  // PAR-Q state
  const [answers, setAnswers] = useState<Record<number, boolean | null>>(
    Object.fromEntries(PAR_Q_QUESTIONS.map((_, i) => [i, null]))
  );
  const [agreed, setAgreed] = useState(false);
  const [savingParq, setSavingParq] = useState(false);

  const formatBirthDate = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  };

  const allAnswered = PAR_Q_QUESTIONS.every((_, i) => answers[i] !== null);
  const hasYes = Object.values(answers).some((v) => v === true);
  const canSubmitParq = allAnswered && agreed;

  const setAnswer = (index: number, value: boolean) => {
    setAnswers((prev) => ({ ...prev, [index]: value }));
  };

  const handleSaveTriage = async () => {
    if (!user) return;
    setSavingTriage(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        phone: phone.trim() || null,
        emergency_contact: emergencyContact.trim() || null,
        main_objective: objective || null,
        has_injury: hasInjury,
        injury_details: hasInjury ? injuryDetails.trim() || null : null,
        is_active: isActivePhysical,
        height: height.trim() || null,
        birth_date: birthDate.trim() || null,
        profile_completed: true,
      })
      .eq('id', user.id);
    setSavingTriage(false);

    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível salvar. Tente novamente.', variant: 'destructive' });
      return;
    }
    await refreshProfile();
    setStep('parq');
  };

  const handleSubmitParq = async () => {
    if (!user || !canSubmitParq) return;
    setSavingParq(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        liability_accepted: true,
        liability_accepted_at: new Date().toISOString(),
      })
      .eq('id', user.id);
    setSavingParq(false);

    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível salvar. Tente novamente.', variant: 'destructive' });
      return;
    }
    toast({ title: '✅ Tudo pronto!', description: 'Bem-vindo(a) ao Synton.' });
    await refreshProfile();
    onCompleted();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-background overflow-y-auto">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-xl mx-auto px-5 py-4 flex items-center gap-3">
          <img
            src="/logo-synton-symbol.png"
            alt="Synton"
            className="h-9 w-auto object-contain"
          />
          <div className="min-w-0">
            <h1 className="font-display text-base text-foreground leading-tight truncate">
              Bem-vindo(a) ao Synton
            </h1>
            <p className="text-xs text-muted-foreground">
              Passo {step === 'triage' ? '1' : '2'} de 2 ·{' '}
              {step === 'triage' ? 'Ficha de Triagem' : 'Termo de Saúde'}
            </p>
          </div>
        </div>
        {/* Progress */}
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-accent transition-all duration-500"
            style={{ width: step === 'triage' ? '50%' : '100%' }}
          />
        </div>
      </header>

      <main className="max-w-xl mx-auto px-5 py-6 pb-32">
        {step === 'triage' ? (
          <section className="space-y-6 animate-fade-in">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center">
                <ClipboardList className="w-6 h-6 text-accent" />
              </div>
              <h2 className="font-display text-2xl text-foreground">Ficha de Triagem</h2>
              <p className="text-sm text-muted-foreground">
                Esses dados ajudam seu personal a montar o treino ideal para você.
              </p>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="o-birth">Data de Nascimento</Label>
                <Input
                  id="o-birth"
                  inputMode="numeric"
                  placeholder="DD/MM/AAAA"
                  value={birthDate}
                  onChange={(e) => setBirthDate(formatBirthDate(e.target.value))}
                  maxLength={10}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="o-height">Altura (ex: 1.75)</Label>
                <Input
                  id="o-height"
                  placeholder="1.75"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  maxLength={10}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="o-phone">Telefone / WhatsApp</Label>
                <Input
                  id="o-phone"
                  inputMode="tel"
                  placeholder="(11) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={20}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="o-emergency">Contato de Emergência - Nome e Fone</Label>
                <Input
                  id="o-emergency"
                  placeholder="Maria - (11) 98888-8888"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label>Objetivo Principal</Label>
                <Select value={objective} onValueChange={setObjective}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione seu objetivo" />
                  </SelectTrigger>
                  <SelectContent>
                    {OBJECTIVES.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="o-injury" className="flex-1 leading-snug">
                    Possui alguma lesão, dor ou limitação?
                  </Label>
                  <Switch id="o-injury" checked={hasInjury} onCheckedChange={setHasInjury} />
                </div>
                {hasInjury && (
                  <Textarea
                    placeholder="Por favor, descreva sua lesão ou limitação..."
                    value={injuryDetails}
                    onChange={(e) => setInjuryDetails(e.target.value)}
                    maxLength={500}
                    className="animate-fade-in bg-background"
                  />
                )}
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 p-4">
                <Label htmlFor="o-active" className="flex-1 leading-snug">
                  Pratica atividade física atualmente?
                </Label>
                <Switch id="o-active" checked={isActivePhysical} onCheckedChange={setIsActivePhysical} />
              </div>
            </div>
          </section>
        ) : (
          <section className="space-y-6 animate-fade-in">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-accent" />
              </div>
              <h2 className="font-display text-2xl text-foreground">Termo de Saúde</h2>
              <p className="text-sm text-muted-foreground">
                PAR-Q — Questionário de Prontidão para Atividade Física. Responda com honestidade.
              </p>
            </div>

            <div className="space-y-3">
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

            {hasYes && (
              <div className="bg-destructive/5 border-l-4 border-destructive p-4 rounded-r-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-destructive text-sm font-semibold leading-snug">
                    Atenção: Como você respondeu "Sim" a uma ou mais perguntas, é obrigatória a avaliação e liberação médica antes do início dos treinos.
                  </p>
                </div>
              </div>
            )}

            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={agreed}
                onCheckedChange={(v) => setAgreed(v === true)}
                className="mt-0.5"
              />
              <span className="text-sm text-foreground font-medium leading-snug">
                Li e concordo com os termos de saúde e responsabilidade acima.
              </span>
            </label>
          </section>
        )}
      </main>

      {/* Sticky footer CTA */}
      <footer className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-background/95 backdrop-blur">
        <div className="max-w-xl mx-auto px-5 py-4">
          {step === 'triage' ? (
            <Button
              variant="accent"
              size="lg"
              className="w-full"
              onClick={handleSaveTriage}
              disabled={savingTriage}
            >
              {savingTriage ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Salvar Ficha e Continuar
            </Button>
          ) : (
            <Button
              variant="accent"
              size="lg"
              className="w-full"
              onClick={handleSubmitParq}
              disabled={!canSubmitParq || savingParq}
            >
              {savingParq ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="w-5 h-5 mr-2" />
              )}
              Assinar e Começar
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}