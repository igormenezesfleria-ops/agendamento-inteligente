import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, Heart, Brain, Zap, Activity } from 'lucide-react';

interface QuestionnaireModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questionnaire: { id: string; type: string } | null;
}

const PAR_Q_QUESTIONS = [
  'O seu médico já lhe disse que você tem um problema cardíaco ou pressão alta?',
  'Você sente dor no peito em repouso ou durante suas atividades diárias?',
  'Você perde o equilíbrio por causa de tontura ou perdeu a consciência nos últimos 12 meses?',
  'Você tem algum problema ósseo ou articular que poderia piorar com a atividade física?',
  'Você toma medicamentos prescritos para a pressão arterial ou problemas cardíacos?',
  'Você tem alguma outra razão pela qual não deveria fazer atividade física?',
];

const HOOPER_SCALES = [
  { key: 'sleep', label: 'Qualidade do Sono', icon: Heart, low: 'Excelente', high: 'Péssima' },
  { key: 'stress', label: 'Nível de Estresse', icon: Brain, low: 'Muito Baixo', high: 'Muito Alto' },
  { key: 'fatigue', label: 'Nível de Fadiga', icon: Zap, low: 'Muito Baixa', high: 'Muito Alta' },
  { key: 'pain', label: 'Dor Muscular Tardia', icon: Activity, low: 'Nenhuma', high: 'Muito Intensa' },
];

const SARCF_QUESTIONS = [
  {
    question: 'Força: Quanta dificuldade você tem para levantar e carregar 4,5 kg?',
    options: ['Nenhuma dificuldade (0)', 'Alguma dificuldade (1)', 'Muita dificuldade ou incapaz (2)'],
  },
  {
    question: 'Assistência para andar: Quanta dificuldade você tem para caminhar pelo cômodo?',
    options: ['Nenhuma (0)', 'Alguma (1)', 'Muita ou usa ajuda (2)'],
  },
  {
    question: 'Levantar de uma cadeira: Quanta dificuldade você tem para se transferir de uma cadeira ou cama?',
    options: ['Nenhuma dificuldade (0)', 'Alguma dificuldade (1)', 'Muita dificuldade ou incapaz (2)'],
  },
  {
    question: 'Subir escadas: Quanta dificuldade você tem para subir um lance de 10 degraus?',
    options: ['Nenhuma (0)', 'Alguma (1)', 'Muita ou incapaz (2)'],
  },
  {
    question: 'Quedas: Quantas vezes você caiu no último ano?',
    options: ['Nenhuma (0)', '1 a 3 quedas (1)', '4 ou mais quedas (2)'],
  },
];

const FESI_QUESTIONS = [
  'Vestir-se ou despir-se',
  'Tomar banho',
  'Levantar-se de uma cadeira',
  'Subir ou descer escadas',
  'Pegar algo acima da cabeça ou do chão',
  'Andar em superfície escorregadia (ex.: molhada ou com gelo)',
  'Andar em superfície irregular (ex.: pedras, buracos)',
];

const FESI_OPTIONS = [
  { label: 'Nem um pouco preocupado', score: 1 },
  { label: 'Um pouco preocupado', score: 2 },
  { label: 'Muito preocupado', score: 3 },
  { label: 'Extremamente preocupado', score: 4 },
];

function OptionCard({
  selected,
  onClick,
  children,
  variant = 'default',
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'default' | 'yes' | 'no';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-xl border-2 px-4 py-3 text-left font-semibold transition-all duration-200',
        'hover:scale-[1.02] active:scale-[0.98]',
        selected
          ? 'border-accent bg-accent/10 text-accent shadow-md shadow-accent/20'
          : 'border-border bg-card text-foreground hover:border-accent/40 hover:bg-accent/5',
        variant === 'yes' && selected && 'border-warning bg-warning/10 text-warning shadow-warning/20',
        variant === 'no' && selected && 'border-success bg-success/10 text-success shadow-success/20',
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all',
            selected
              ? variant === 'yes'
                ? 'border-warning bg-warning text-warning-foreground'
                : variant === 'no'
                ? 'border-success bg-success text-success-foreground'
                : 'border-accent bg-accent text-accent-foreground'
              : 'border-muted-foreground/30'
          )}
        >
          {selected && <CheckCircle2 className="h-4 w-4" />}
        </div>
        <span className="text-sm">{children}</span>
      </div>
    </button>
  );
}

function HooperScale({
  scale,
  value,
  onChange,
}: {
  scale: typeof HOOPER_SCALES[number];
  value: number;
  onChange: (v: number) => void;
}) {
  const Icon = scale.icon;
  return (
    <div className="space-y-3 rounded-xl border-2 border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
          <Icon className="h-4 w-4 text-accent" />
        </div>
        <h4 className="font-bold text-foreground">{scale.label}</h4>
        <span className="ml-auto rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground">
          {value}/7
        </span>
      </div>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              'flex h-10 w-full items-center justify-center rounded-lg border-2 text-sm font-bold transition-all duration-200',
              'hover:scale-105 active:scale-95',
              n === value
                ? n <= 3
                  ? 'border-success bg-success text-success-foreground shadow-md'
                  : n <= 5
                  ? 'border-warning bg-warning text-warning-foreground shadow-md'
                  : 'border-destructive bg-destructive text-destructive-foreground shadow-md'
                : 'border-border bg-secondary text-muted-foreground hover:border-accent/40'
            )}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>1 — {scale.low}</span>
        <span>7 — {scale.high}</span>
      </div>
    </div>
  );
}

export function QuestionnaireModal({ open, onOpenChange, questionnaire }: QuestionnaireModalProps) {
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [parqAnswers, setParqAnswers] = useState<Record<number, string>>({});
  const [hooperValues, setHooperValues] = useState<Record<string, number>>({
    sleep: 1, stress: 1, fatigue: 1, pain: 1,
  });
  const [sarcfAnswers, setSarcfAnswers] = useState<Record<number, number>>({});
  const [fesiAnswers, setFesiAnswers] = useState<Record<number, number>>({});

  if (!questionnaire) return null;

  const type = questionnaire.type;

  const canSubmit = () => {
    if (type === 'PAR-Q') return Object.keys(parqAnswers).length === PAR_Q_QUESTIONS.length;
    if (type === 'HOOPER') return true;
    if (type === 'SARC-F') return Object.keys(sarcfAnswers).length === 5;
    if (type === 'FES-I') return Object.keys(fesiAnswers).length === FESI_QUESTIONS.length;
    return false;
  };

  const handleSubmit = async () => {
    if (!canSubmit()) {
      toast({ title: 'Preencha todas as perguntas antes de enviar.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);

    let answersData: Record<string, unknown> = {};
    let resultScore = '';

    if (type === 'PAR-Q') {
      answersData = { questions: PAR_Q_QUESTIONS.map((q, i) => ({ question: q, answer: parqAnswers[i] })) };
      const yesCount = Object.values(parqAnswers).filter(a => a === 'sim').length;
      resultScore = yesCount > 0 ? `${yesCount}/6 SIM — Necessita Liberação Médica` : '0/6 SIM — Apto';
    } else if (type === 'HOOPER') {
      answersData = { scales: hooperValues };
      const total = Object.values(hooperValues).reduce((s, v) => s + v, 0);
      resultScore = `${total}/28`;
    } else if (type === 'SARC-F') {
      answersData = { questions: SARCF_QUESTIONS.map((q, i) => ({ question: q.question, score: sarcfAnswers[i] ?? 0 })) };
      const total = Object.values(sarcfAnswers).reduce((s, v) => s + v, 0);
      resultScore = total >= 4 ? `${total}/10 — Risco de Sarcopenia Sugerido` : `${total}/10 — Sem risco identificado`;
    } else if (type === 'FES-I') {
      answersData = { questions: FESI_QUESTIONS.map((q, i) => ({ question: q, score: fesiAnswers[i] ?? 1 })) };
      const total = Object.values(fesiAnswers).reduce((s, v) => s + v, 0);
      resultScore = total > 10 ? `${total}/28 — Alta preocupação com quedas` : `${total}/28 — Baixa preocupação`;
    }

    const { error } = await supabase
      .from('sent_questionnaires')
      .update({
        status: 'completed',
        answers_data: answersData as unknown as import('@/integrations/supabase/types').Json,
        result_score: resultScore,
      })
      .eq('id', questionnaire.id);

    setSubmitting(false);

    if (error) {
      toast({ title: 'Erro ao enviar resposta.', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: '✅ Resposta enviada ao seu Personal!' });
    queryClient.invalidateQueries({ queryKey: ['pending-questionnaires'] });
    onOpenChange(false);

    setParqAnswers({});
    setHooperValues({ sleep: 1, stress: 1, fatigue: 1, pain: 1 });
    setSarcfAnswers({});
    setFesiAnswers({});
  };

  const typeLabel = type === 'PAR-Q' ? 'PAR-Q+ — Liberação Médica' : type === 'HOOPER' ? 'Índice de Hooper — Recuperação' : 'SARC-F — Rastreio de Sarcopenia';
  const footerText = type === 'PAR-Q'
    ? 'Referência: PAR-Q+ Collaboration (Warburton et al.)'
    : type === 'HOOPER'
    ? 'Referência: Hooper et al., 1995'
    : 'Referência: Malmstrom & Morley, 2013';

  const hasYes = type === 'PAR-Q' && Object.values(parqAnswers).some(a => a === 'sim');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-border bg-primary px-6 py-4">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-primary-foreground">{typeLabel}</DialogTitle>
          </DialogHeader>
        </div>

        <div className="space-y-5 px-6 py-5">
          {/* PAR-Q */}
          {type === 'PAR-Q' &&
            PAR_Q_QUESTIONS.map((q, i) => (
              <div key={i} className="space-y-2.5">
                <p className="text-sm font-bold text-foreground leading-snug">
                  <span className="mr-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  {q}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <OptionCard
                    selected={parqAnswers[i] === 'sim'}
                    onClick={() => setParqAnswers(prev => ({ ...prev, [i]: 'sim' }))}
                    variant="yes"
                  >
                    Sim
                  </OptionCard>
                  <OptionCard
                    selected={parqAnswers[i] === 'nao'}
                    onClick={() => setParqAnswers(prev => ({ ...prev, [i]: 'nao' }))}
                    variant="no"
                  >
                    Não
                  </OptionCard>
                </div>
              </div>
            ))}

          {/* PAR-Q alert */}
          {type === 'PAR-Q' && hasYes && (
            <div className="flex items-start gap-3 rounded-xl border-2 border-warning bg-warning/10 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
              <div>
                <p className="text-sm font-bold text-warning">Atenção: Liberação Médica Necessária</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Você respondeu "Sim" a uma ou mais perguntas. Recomendamos apresentar uma liberação médica ao seu Personal antes de iniciar atividades físicas.
                </p>
              </div>
            </div>
          )}

          {/* HOOPER */}
          {type === 'HOOPER' &&
            HOOPER_SCALES.map((scale) => (
              <HooperScale
                key={scale.key}
                scale={scale}
                value={hooperValues[scale.key]}
                onChange={(v) => setHooperValues(prev => ({ ...prev, [scale.key]: v }))}
              />
            ))}

          {/* Hooper total */}
          {type === 'HOOPER' && (
            <div className="flex items-center justify-between rounded-xl border-2 border-primary bg-primary/5 p-4">
              <span className="text-sm font-bold text-foreground">Score Total</span>
              <span className="text-2xl font-black text-primary">
                {Object.values(hooperValues).reduce((s, v) => s + v, 0)}/28
              </span>
            </div>
          )}

          {/* SARC-F */}
          {type === 'SARC-F' &&
            SARCF_QUESTIONS.map((q, i) => (
              <div key={i} className="space-y-2.5">
                <p className="text-sm font-bold text-foreground leading-snug">
                  <span className="mr-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  {q.question}
                </p>
                <div className="space-y-1.5">
                  {q.options.map((opt, oi) => (
                    <OptionCard
                      key={oi}
                      selected={sarcfAnswers[i] === oi}
                      onClick={() => setSarcfAnswers(prev => ({ ...prev, [i]: oi }))}
                    >
                      {opt} ({oi} pt{oi !== 1 ? 's' : ''})
                    </OptionCard>
                  ))}
                </div>
              </div>
            ))}

          {/* Footer reference */}
          <p className="text-[11px] italic text-muted-foreground pt-2 border-t border-border">
            {footerText}
          </p>
        </div>

        {/* Submit */}
        <div className="sticky bottom-0 border-t border-border bg-card px-6 py-4">
          <Button
            onClick={handleSubmit}
            disabled={submitting || !canSubmit()}
            variant="accent"
            size="lg"
            className="w-full"
          >
            {submitting ? 'Enviando...' : 'Enviar Respostas'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
