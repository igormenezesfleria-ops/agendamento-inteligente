import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface QuestionnaireModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questionnaire: { id: string; type: string } | null;
}

const PAR_Q_QUESTIONS = [
  'Algum médico já disse que você possui algum problema de coração e recomendou que você só fizesse atividade física sob supervisão médica?',
  'Você sente dor no peito quando faz atividade física?',
  'No último mês, você sentiu dor no peito quando não estava fazendo atividade física?',
  'Você perde o equilíbrio por causa de tontura ou alguma vez perdeu a consciência?',
  'Você possui algum problema ósseo ou articular que poderia piorar com a prática de atividade física?',
  'Algum médico já prescreveu medicamentos para a sua pressão arterial ou problema cardíaco?',
  'Você conhece alguma outra razão pela qual não deveria praticar atividade física?',
];

const HOOPER_SCALES = [
  { key: 'sleep', label: 'Qualidade do Sono', low: 'Muito boa', high: 'Muito ruim' },
  { key: 'stress', label: 'Nível de Estresse', low: 'Muito baixo', high: 'Muito alto' },
  { key: 'fatigue', label: 'Fadiga Geral', low: 'Nenhuma', high: 'Muito alta' },
  { key: 'pain', label: 'Dor Muscular', low: 'Nenhuma', high: 'Muita dor' },
];

const SARCF_QUESTIONS = [
  {
    question: 'Força: Quanta dificuldade você tem para levantar e carregar 5 kg?',
    options: ['Nenhuma', 'Alguma', 'Muita ou incapaz'],
  },
  {
    question: 'Caminhada: Quanta dificuldade você tem para atravessar um cômodo?',
    options: ['Nenhuma', 'Alguma', 'Muita, precisa de ajuda ou incapaz'],
  },
  {
    question: 'Levantar-se: Quanta dificuldade você tem para se levantar de uma cadeira ou cama?',
    options: ['Nenhuma', 'Alguma', 'Muita ou incapaz sem ajuda'],
  },
  {
    question: 'Subir escadas: Quanta dificuldade você tem para subir um lance de 10 degraus?',
    options: ['Nenhuma', 'Alguma', 'Muita ou incapaz'],
  },
  {
    question: 'Quedas: Quantas vezes você caiu no último ano?',
    options: ['Nenhuma', '1 a 3 quedas', '4 ou mais quedas'],
  },
];

export function QuestionnaireModal({ open, onOpenChange, questionnaire }: QuestionnaireModalProps) {
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  // PAR-Q state
  const [parqAnswers, setParqAnswers] = useState<Record<number, string>>({});

  // HOOPER state
  const [hooperValues, setHooperValues] = useState<Record<string, number>>({
    sleep: 1, stress: 1, fatigue: 1, pain: 1,
  });

  // SARC-F state
  const [sarcfAnswers, setSarcfAnswers] = useState<Record<number, number>>({});

  if (!questionnaire) return null;

  const type = questionnaire.type;

  const canSubmit = () => {
    if (type === 'PAR-Q') return Object.keys(parqAnswers).length === 7;
    if (type === 'HOOPER') return true;
    if (type === 'SARC-F') return Object.keys(sarcfAnswers).length === 5;
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
      resultScore = `${yesCount}/7 SIM`;
    } else if (type === 'HOOPER') {
      answersData = { scales: hooperValues };
      const total = Object.values(hooperValues).reduce((s, v) => s + v, 0);
      resultScore = `${total}/28`;
    } else if (type === 'SARC-F') {
      answersData = { questions: SARCF_QUESTIONS.map((q, i) => ({ question: q.question, score: sarcfAnswers[i] ?? 0 })) };
      const total = Object.values(sarcfAnswers).reduce((s, v) => s + v, 0);
      resultScore = `${total}/10`;
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

    // Reset
    setParqAnswers({});
    setHooperValues({ sleep: 1, stress: 1, fatigue: 1, pain: 1 });
    setSarcfAnswers({});
  };

  const typeLabel = type === 'PAR-Q' ? 'PAR-Q+' : type === 'HOOPER' ? 'Índice de Hooper' : 'SARC-F';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">{typeLabel}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {type === 'PAR-Q' && (
            PAR_Q_QUESTIONS.map((q, i) => (
              <div key={i} className="space-y-2">
                <p className="text-sm font-medium">{i + 1}. {q}</p>
                <RadioGroup
                  value={parqAnswers[i] || ''}
                  onValueChange={(v) => setParqAnswers(prev => ({ ...prev, [i]: v }))}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="sim" id={`parq-${i}-sim`} />
                    <Label htmlFor={`parq-${i}-sim`} className="text-sm">Sim</Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="nao" id={`parq-${i}-nao`} />
                    <Label htmlFor={`parq-${i}-nao`} className="text-sm">Não</Label>
                  </div>
                </RadioGroup>
              </div>
            ))
          )}

          {type === 'HOOPER' && (
            HOOPER_SCALES.map((scale) => (
              <div key={scale.key} className="space-y-3">
                <div className="flex justify-between items-baseline">
                  <p className="text-sm font-medium">{scale.label}</p>
                  <span className="text-xs font-bold text-primary">{hooperValues[scale.key]}/7</span>
                </div>
                <Slider
                  min={1}
                  max={7}
                  step={1}
                  value={[hooperValues[scale.key]]}
                  onValueChange={([v]) => setHooperValues(prev => ({ ...prev, [scale.key]: v }))}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1 – {scale.low}</span>
                  <span>7 – {scale.high}</span>
                </div>
              </div>
            ))
          )}

          {type === 'SARC-F' && (
            SARCF_QUESTIONS.map((q, i) => (
              <div key={i} className="space-y-2">
                <p className="text-sm font-medium">{i + 1}. {q.question}</p>
                <RadioGroup
                  value={sarcfAnswers[i]?.toString() || ''}
                  onValueChange={(v) => setSarcfAnswers(prev => ({ ...prev, [i]: parseInt(v) }))}
                  className="space-y-1.5"
                >
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <RadioGroupItem value={oi.toString()} id={`sarcf-${i}-${oi}`} />
                      <Label htmlFor={`sarcf-${i}-${oi}`} className="text-sm">
                        {opt} ({oi} pt{oi !== 1 ? 's' : ''})
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            ))
          )}
        </div>

        <Button onClick={handleSubmit} disabled={submitting || !canSubmit()} className="w-full">
          {submitting ? 'Enviando...' : 'Enviar Respostas'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
